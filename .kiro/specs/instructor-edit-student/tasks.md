# Plan de Implementación: Instructor Edit Student

## Resumen

Implementación de la funcionalidad de edición de alumnos para instructores, siguiendo Clean Architecture de adentro hacia afuera: use case → server action → client component → server component → punto de entrada.

## Tareas

- [x] 1. Implementar use case `updateStudentProfile`
  - Crear `src/modules/practitioner-identity/application/use-cases/updateStudentProfile.ts`
  - Definir y exportar `UpdateStudentProfileInputSchema` con Zod (publicId UUID, weightKg positivo nullable, heightCm entero 50–250 nullable, contactPhone máx 30 nullable, contactEmail email nullable, addressStreet máx 200 nullable, addressCity máx 100 nullable, addressRegion máx 100 nullable)
  - Implementar `updateStudentProfile(input, deps)` con semántica de patch parcial: campos `undefined` no modifican el valor existente, campos `null` limpian el valor
  - Verificar existencia del practicante (`PractitionerNotFoundError` si no existe)
  - Verificar que el practicante está activo (`PractitionerInactiveError` si `isActive === false`)
  - Nunca modificar los campos de identidad: rut, fullName, birthDate, gender, grade, dan, role
  - Renovar `updatedAt` con la fecha y hora actuales en cada llamada exitosa
  - Aceptar dependencias por parámetro (`deps: { practitionerRepo: PractitionerRepository }`) — no instanciar el repo internamente
  - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ]\* 1.1 Escribir property test: patch semántico — campos no provistos permanecen inalterados
    - **Propiedad 2: Patch semántico — campos no provistos permanecen inalterados**
    - Para cualquier practicante activo y cualquier subconjunto de campos editables, los campos NO incluidos en el input deben tener exactamente el mismo valor en el practicante guardado que en el original
    - Usar `fast-check` para generar subconjuntos arbitrarios de los 7 campos editables
    - **Valida: Requisitos 2.1, 2.2, 2.3**

  - [ ]\* 1.2 Escribir property test: inmutabilidad de campos de identidad
    - **Propiedad 3: Inmutabilidad de campos de identidad**
    - Para cualquier input válido, rut, fullName, birthDate, gender, grade, dan y role del practicante guardado deben ser idénticos a los del original
    - Usar `fast-check` para generar inputs válidos arbitrarios
    - **Valida: Requisito 2.4**

  - [ ]\* 1.3 Escribir property test: validación rechaza valores fuera de rango
    - **Propiedad 6: Validación rechaza valores fuera de rango**
    - Para cualquier weightKg no positivo, heightCm fuera de [50, 250], o contactEmail con formato inválido, el schema debe retornar error de validación y nunca persistir el valor
    - Usar `fast-check` para generar valores inválidos en cada campo
    - **Valida: Requisitos 5.2, 5.3, 5.4**

  - [ ]\* 1.4 Escribir tests unitarios para `updateStudentProfile`
    - Caso feliz: actualiza solo los campos provistos, no toca los demás
    - Limpiar campos: campos `null` se persisten como `null`
    - `PractitionerNotFoundError` cuando el repo retorna `null`
    - `PractitionerInactiveError` cuando `isActive === false`
    - `updatedAt` se renueva en cada llamada exitosa
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 2. Implementar `updateStudentProfileAction` en `instructorActions.ts`
  - Agregar el nuevo export `updateStudentProfileAction(rawInput: unknown): Promise<ActionResult>` al archivo existente `src/modules/practitioner-identity/presentation/actions/instructorActions.ts`
  - Definir `UpdateStudentProfileActionSchema` (extiende `UpdateStudentProfileInputSchema`)
  - Seguir la secuencia obligatoria: autenticación → validación Zod → autorización (pertenencia del alumno) → ejecución del use case → revalidatePath
  - Verificar sesión con `createClient().auth.getUser()` — retornar `FORBIDDEN` si no hay sesión o el rol no es instructor/profesor/maestro
  - Validar input con `safeParse` — retornar `VALIDATION_ERROR` si falla
  - Verificar que el alumno pertenece al instructor (alumno directo o de su academia) — misma lógica que la página de detalle existente — retornar `FORBIDDEN` si no pertenece
  - Instanciar `DrizzlePractitionerRepository` y llamar a `updateStudentProfile`
  - Llamar a `revalidatePath` para la página de detalle (`/instructor/students/[id]`) y la de edición (`/instructor/students/[id]/edit`)
  - Capturar `PractitionerNotFoundError` → `NOT_FOUND`, `PractitionerInactiveError` → `FORBIDDEN`, errores inesperados → loguear server-side y retornar `INTERNAL_ERROR`
  - Retornar `ActionResult` tipado en todos los caminos de código — nunca lanzar excepciones no manejadas al cliente
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [ ]\* 2.1 Escribir property test: autorización — solo alumnos propios
    - **Propiedad 4: Autorización en la Server Action — solo alumnos propios**
    - Para cualquier instructor autenticado y cualquier alumno que no le pertenezca, la acción debe retornar `{ success: false, code: "FORBIDDEN" }` sin ejecutar la mutación
    - **Valida: Requisitos 3.5, 3.6**

  - [ ]\* 2.2 Escribir property test: ActionResult siempre tipado
    - **Propiedad 5: ActionResult siempre tipado**
    - Para cualquier input (válido, inválido o malformado), la acción debe retornar siempre un objeto con la forma `{ success: boolean }` — nunca `undefined`, nunca lanzar excepción no manejada al cliente
    - **Valida: Requisito 3.10**

- [x] 3. Checkpoint — Verificar capa de dominio y acciones
  - Asegurarse de que todos los tests pasan, consultar al usuario si surgen dudas.

- [x] 4. Implementar `EditStudentForm.tsx` (Client Component)
  - Crear `src/app/(dashboard)/instructor/students/[id]/edit/EditStudentForm.tsx`
  - Agregar directiva `"use client"` al inicio del archivo
  - Definir la interfaz `StudentEditData` (publicId, weightKg, heightCm, contactPhone, contactEmail, addressStreet, addressCity, addressRegion — sin campos sensibles)
  - Definir la interfaz `Props` con `student: StudentEditData` y `backHref: string`
  - Inicializar el estado local con `useState` para cada campo, usando los valores del prop `student` como valor inicial
  - Renderizar campos de formulario: peso (number), estatura (number), teléfono (text), email (email), calle (text), ciudad (text), región (text)
  - Llamar a `updateStudentProfileAction` dentro de `useTransition` al enviar el formulario
  - Deshabilitar el botón de envío y mostrar indicador de carga mientras `isPending === true`
  - Mostrar mensaje de error inline cuando la acción retorna `{ success: false }` sin perder los valores del formulario
  - Redirigir con `router.push(backHref)` cuando la acción retorna `{ success: true }`
  - No recibir ni exponer en props: rut, authUserId, qrToken, grade, dan, role ni campos de auditoría
  - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]\* 4.1 Escribir property test: pre-carga del formulario con datos actuales
    - **Propiedad 7: Pre-carga del formulario con datos actuales**
    - Para cualquier `StudentEditData` válido, el formulario debe inicializar cada campo con el valor correspondiente del prop `student`
    - Usar `fast-check` para generar `StudentEditData` arbitrarios y verificar que el estado inicial del formulario coincide con los datos recibidos
    - **Valida: Requisito 4.1**

  - [ ]\* 4.2 Escribir tests unitarios para `EditStudentForm`
    - Verificar que el formulario muestra error inline cuando la acción retorna `{ success: false }`
    - Verificar que el botón se deshabilita durante `isPending`
    - Verificar que los valores del formulario no se pierden al mostrar un error
    - _Requisitos: 4.3, 4.4_

- [x] 5. Implementar `edit/page.tsx` (Server Component)
  - Crear `src/app/(dashboard)/instructor/students/[id]/edit/page.tsx`
  - Declarar como `async` Server Component (sin `"use client"`)
  - Verificar sesión y rol de instructor con `requireUser()` + consulta a `practitioners` — redirigir a `/dashboard` si no es instructor
  - Cargar el practicante por `id` con `practitionerRepo.findById(id)` — llamar a `notFound()` si no existe
  - Verificar pertenencia del alumno al instructor (alumno directo o de su academia) — misma lógica que la página de detalle — redirigir a `/instructor` si no pertenece
  - Construir el DTO `StudentEditData` con solo los 7 campos editables + publicId, excluyendo explícitamente rut, authUserId, qrToken, grade, dan, role y campos de auditoría
  - Renderizar `<EditStudentForm student={studentEditData} backHref={`/instructor/students/${id}`} />`
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]\* 5.1 Escribir property test: verificación de pertenencia en la página de edición
    - **Propiedad 1: Verificación de pertenencia del alumno en la página de edición**
    - Para cualquier par (instructor, alumno), la página solo debe renderizar el formulario si el alumno pertenece al instructor; en cualquier otro caso debe redirigir a `/instructor`
    - **Valida: Requisito 1.4**

- [x] 6. Agregar botón "Editar alumno" en `instructor/students/[id]/page.tsx`
  - Modificar `src/app/(dashboard)/instructor/students/[id]/page.tsx`
  - Agregar un `Link` de Next.js que navegue a `/instructor/students/${id}/edit`
  - Ubicar el botón en la sección del hero card, junto al nombre del alumno o en el área de acciones, siguiendo el estilo visual del proyecto
  - Usar las clases CSS del diseño: `inline-flex items-center gap-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors`
  - El botón debe ser visible para instructores autenticados que sean propietarios del alumno (la página ya verifica esto antes de renderizar)
  - _Requisitos: 6.1, 6.2, 6.3_

- [x] 7. Checkpoint final — Verificar integración completa
  - Asegurarse de que todos los tests pasan, consultar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los checkpoints garantizan validación incremental
- Los property tests validan propiedades universales de corrección
- Los tests unitarios validan ejemplos específicos y casos borde
- La implementación sigue Clean Architecture de adentro hacia afuera: domain → application → infrastructure → presentation → app
