-- Migration 039: Remove auth.users foreign key from practitioners
-- Description: Elimina la relación de foreign key entre practitioners.auth_user_id 
--              y auth.users.id para permitir eliminación física de usuarios sin restricciones.
--              El campo auth_user_id se mantiene como UUID nullable para referencia histórica.

-- ============================================================
-- DROP FOREIGN KEY CONSTRAINT
-- ============================================================

-- 1. Eliminar la constraint de foreign key
ALTER TABLE practitioners
DROP CONSTRAINT IF EXISTS practitioners_auth_user_id_fkey;

-- 2. Mantener el índice UNIQUE para que no haya duplicados
-- (esto permite que un auth_user_id solo esté asociado a un practitioner)
-- El índice único ya existe, no necesitamos recrearlo

-- ============================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================

COMMENT ON COLUMN practitioners.auth_user_id IS 
'UUID del usuario en auth.users. Puede ser NULL si el usuario fue eliminado. Sin FK constraint para permitir eliminación física de usuarios manteniendo historial del practicante.';

-- ============================================================
-- NOTAS IMPORTANTES
-- ============================================================

-- Con esta migración:
-- 1. ✅ Puedes eliminar físicamente usuarios de auth.users sin restricciones
-- 2. ✅ El historial del practicante se mantiene intacto (no hay CASCADE DELETE)
-- 3. ✅ El campo auth_user_id permanece como referencia histórica (puede quedar con un UUID que ya no existe)
-- 4. ✅ is_active = false y deactivated_at permiten deshabilitar practicantes
-- 5. ⚠️  Debes manejar manualmente la lógica de poner auth_user_id en NULL cuando elimines un usuario

-- Ejemplo de caso de uso:
-- 1. Instructor elimina un practicante
-- 2. Se marca is_active = false, se establece deactivated_at y deactivation_reason
-- 3. Se elimina físicamente el usuario de auth.users (DELETE FROM auth.users WHERE id = ?)
-- 4. Opcionalmente, se pone auth_user_id = NULL en practitioners para limpieza
-- 5. El historial, certificaciones, eventos, etc. del practicante se mantienen
