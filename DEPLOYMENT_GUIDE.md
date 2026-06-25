# Guía de Despliegue — Optimizaciones de Rendimiento

**Versión**: 2026-06-24  
**Ambiente**: Production  
**Riesgo**: Muy Bajo (cambios internos, sin API breaking changes)

---

## 1. Pre-Deployment

### 1.1 Verificaciones Locales

```bash
# Compilar sin errores
pnpm build

# Verificar tipos (debería pasar sin errores)
pnpm type-check

# Ejecutar linter
pnpm lint

# Ejecutar tests (si existen)
pnpm test
```

### 1.2 Code Review Checklist

- ✅ `requireAdmin()` en [src/lib/auth-guards.ts](src/lib/auth-guards.ts)
- ✅ Dashboard con COUNT paralelos en [src/app/(dashboard)/admin/dashboard/page.tsx](<src/app/(dashboard)/admin/dashboard/page.tsx>)
- ✅ Batch insert (1000 máximo) en [src/modules/notifications/infrastructure/repositories/drizzleNotificationRepository.ts](src/modules/notifications/infrastructure/repositories/drizzleNotificationRepository.ts)
- ✅ Límites en search: [src/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository.ts](src/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository.ts)
- ✅ Filtro de expiración en DB (no en Node.js)
- ✅ `revalidatePath` removido de notificaciones

---

## 2. Estrategia de Rollout

### Opción A: Canary Deployment (Recomendado)

**Día 1 — 5% de tráfico**

```
1. Deploy a 1 instancia de app
2. Enviar 5% de requests a instancia nueva
3. Monitorear por 2 horas sin alertas
4. Incrementar a 25%
```

**Día 2 — 50% de tráfico**

```
1. Incrementar a 50%
2. Monitorear por 4 horas
3. Si no hay problemas, 100%
```

**Día 3 — 100%**

**Métricas a monitorear**:

- Query latency (target: < 300ms)
- Error rate (target: < 0.1%)
- CPU/Memory (target: no spike)
- Database connections (target: no spike)

### Opción B: Full Deployment (si confianza es alta)

1. Deploy a todas las instancias simultáneamente
2. Monitoreo intenso por 1 hora
3. Plan de rollback preparado

---

## 3. Monitoreo Activo

### 3.1 Métricas Clave por Componente

#### Admin Pages

```
Métrica: Query count per request
- Target: 2 (requireUser deduped + getIsAdmin deduped)
- Alert threshold: > 4
- Query: SELECT COUNT(*) FROM db_queries WHERE page_type='admin'
```

#### Dashboard Admin

```
Métrica: Data transfer per dashboard load
- Target: < 2 KB
- Alert threshold: > 5 KB
- Query: Monitor Supabase network bytes for /admin/dashboard
```

#### Notificaciones

```
Métrica: Batch insert success rate
- Target: 100%
- Alert threshold: < 99%
- Query: Monitor notification_recipients INSERT success/total ratio
```

#### Search Operations

```
Métrica: Search result size
- Target: <= 1000 rows
- Alert threshold: > 2000 rows
- Query: SELECT MAX(result_count) FROM search_metrics
```

### 3.2 Dashboards Recomendados

**Prometheus/Grafana**:

```yaml
# Query latency por endpoint
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Database query count por tipo
histogram_quantile(0.95, rate(db_queries_total[5m]))

# Memory usage en Node.js
nodejs_process_resident_memory_bytes
```

**Supabase Console**:

- Query performance → look for new admin pages
- Storage → check transfer bytes per request
- Real-time → verify no sudden spike in subscriptions

---

## 4. Rollback Plan

Si algo sale mal:

```bash
# Identificar último commit bueno
git log --oneline | head -20

# Revertir cambios
git revert <commit-hash>
pnpm build
# Deploy anterior

# Investigar qué salió mal
git diff <old-commit>..<new-commit>
```

**Cambios que se pueden revertir sin migración**:

- Todos (no hay cambios de schema)

**Tiempo de rollback**: < 5 minutos

---

## 5. Post-Deployment

### 5.1 Validación Inmediata (< 1 hora)

```bash
# Ejecutar script de validación
bash scripts/validate-optimizations.sh
```

Debería retornar:

```
✅ Todas las validaciones pasaron!

📊 Métricas esperadas en producción:
   • Admin dashboard load: < 200ms
   • DB queries por request (admin pages): 2
   • Data transfer (dashboard): ~1KB
```

### 5.2 Test Funcional (< 2 horas)

**Admin login**:

1. Navegar a `/dashboard/admin/dashboard`
2. Verificar que carga en < 200ms
3. Revisar DevTools → Network para confirmar ~1KB data transfer

**Notificaciones**:

1. Abrir 2 pestañas del sistema
2. Crear notificación en una
3. Verificar que aparece en la otra (debe deduplicarse con cache)

**Search**:

1. Ir a búsqueda de practicantes
2. Buscar que retorne > 1000 resultados (deberían limitarse a 1000)
3. Verificar que no hay error

### 5.3 Monitoreo Continuo (próximos 7 días)

**Daily**:

- Error rate (target: < 0.1%)
- P95 latency (target: < 300ms)
- Query performance (target: no regression)

**Weekly**:

- Peak hour load (verify handling of 1M+ concurrent)
- Database connection pool utilization
- Memory trends (look for leaks)

---

## 6. Documentación de Cambios para Equipo

### Para Desarrolladores

- 📄 Lee [PERFORMANCE_OPTIMIZATION.md](../PERFORMANCE_OPTIMIZATION.md) para entender cambios técnicos
- 📄 Lee [RESUMEN_OPTIMIZACION.md](../RESUMEN_OPTIMIZACION.md) para resumen ejecutivo
- 🔧 Para nuevas páginas admin, usa `requireAdmin()` directamente

### Para DevOps

- 📊 Monitorear métricas listadas en sección 3.1
- 🚨 Alertas activadas para thresholds documentados
- 📋 Guardar logs de despliegue para auditoría

### Para QA

- ✅ Ejecutar [scripts/validate-optimizations.sh](validate-optimizations.sh)
- 🧪 Test funcional: Admin load, Notifications, Search
- 📱 Verificar mobile experience (no cambios esperados)

---

## 7. Troubleshooting

### Problema: Admin dashboard tarda > 300ms

**Causas posibles**:

1. COUNT queries no paralelizadas
2. Índices no creados en practitioners

**Solución**:

```typescript
// Verificar que Promise.all se usa
const counts = await Promise.all([
  query1, query2, query3, ...
]);

// O crear índice
CREATE INDEX idx_practitioners_grade ON practitioners(grade);
```

### Problema: Batch insert timeout

**Causas posibles**:

1. Tamaño de batch > 1000
2. Conexión de Supabase inestable

**Solución**:

```typescript
// Verificar BATCH_SIZE
for (let i = 0; i < ids.length; i += 1000) {
  // ← debe ser 1000
  const batch = ids.slice(i, i + 1000);
  // ...
}
```

### Problema: Search retorna > 1000 resultados

**Verificar**:

```sql
SELECT MAX(result_count) FROM search_results WHERE DATE(created_at) = TODAY();
-- Debería ser <= 1000
```

Si > 1000, revisar que `.limit(1000)` está en repositorio.

---

## 8. Checklist de Deployment

- [ ] Compilación limpia (`pnpm build`)
- [ ] TypeScript validation pasa (`pnpm type-check`)
- [ ] Linting pasa (`pnpm lint`)
- [ ] Code review completado
- [ ] Tests pasan (si existen)
- [ ] Rollback plan preparado
- [ ] Monitoreo activado
- [ ] Validación local pasada
- [ ] Deploy a canary (5%)
- [ ] Monitoreo por 2 horas sin alertas
- [ ] Incrementar a 100%
- [ ] Validación post-deploy pasa
- [ ] Comunicar a equipo

---

## 9. Referencias

- [PERFORMANCE_OPTIMIZATION.md](../PERFORMANCE_OPTIMIZATION.md) — Detalle técnico
- [RESUMEN_OPTIMIZACION.md](../RESUMEN_OPTIMIZACION.md) — Resumen ejecutivo
- [validate-optimizations.sh](validate-optimizations.sh) — Script de validación
- Copilot instructions: [.github/copilot-instructions.md](../.github/copilot-instructions.md)

---

**Autor**: Senior Performance Engineering  
**Validado**: 2026-06-24  
**Estado**: Ready for Production
