-- Migration: 041_fix_delete_practitioner_function
-- Description: Corrige la función delete_practitioner_by_instructor para que
--              solo maneje operaciones en el esquema public.
--              La eliminación de auth.users se delega al Server Action usando
--              la Admin API de Supabase, que es el único método confiable.
--
-- Problema anterior:
--   DELETE FROM auth.users dentro de una función SECURITY DEFINER no funciona
--   de forma confiable en Supabase hosted porque:
--   1. El rol postgres puede no tener permisos suficientes sobre auth.users
--   2. No invalida sesiones activas ni limpia auth.sessions / auth.refresh_tokens
--   3. Los triggers del esquema auth no se ejecutan correctamente
--
-- Solución:
--   La función solo desactiva registros en el esquema public y retorna el
--   auth_user_id para que el Server Action lo elimine vía Admin API.

CREATE OR REPLACE FUNCTION public.delete_practitioner_by_instructor(
  p_practitioner_id UUID,
  p_instructor_id UUID,
  p_academy_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id UUID;
  v_practitioner RECORD;
  v_instructor RECORD;
  v_is_owner BOOLEAN;
  v_belongs_to_academy BOOLEAN;
  v_deactivated_memberships INTEGER;
  v_revoked_certs INTEGER;
  v_deactivated_disciplines INTEGER;
BEGIN
  -- 1. Obtener datos del instructor autenticado
  SELECT p.id AS practitioner_id, p.auth_user_id, p.role
  INTO v_instructor
  FROM practitioners p
  WHERE p.auth_user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No tienes permisos de instructor',
      'code', 'UNAUTHORIZED'
    );
  END IF;

  -- Verificar que el usuario autenticado es el instructor especificado
  IF v_instructor.practitioner_id != p_instructor_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ID de instructor no coincide con el usuario autenticado',
      'code', 'UNAUTHORIZED'
    );
  END IF;

  -- 2. Verificar que el practicante existe y está activo
  SELECT * INTO v_practitioner
  FROM practitioners
  WHERE id = p_practitioner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Practicante no encontrado',
      'code', 'NOT_FOUND'
    );
  END IF;

  IF NOT v_practitioner.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El practicante ya está inactivo',
      'code', 'ALREADY_INACTIVE'
    );
  END IF;

  -- 3. Verificar que el instructor registró al practicante
  SELECT (instructor_id = p_instructor_id)
  INTO v_is_owner
  FROM practitioners
  WHERE id = p_practitioner_id;

  IF NOT v_is_owner THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solo puedes eliminar alumnos que tú registraste',
      'code', 'UNAUTHORIZED'
    );
  END IF;

  -- 4. Verificar que el practicante pertenece a una academia del instructor
  SELECT EXISTS (
    SELECT 1
    FROM academy_memberships am
    JOIN academies a ON a.id = am.academy_id
    WHERE am.practitioner_id = p_practitioner_id
      AND am.academy_id = p_academy_id
      AND am.is_active = true
      AND p_instructor_id = ANY(a.responsible_instructor_ids)
  ) INTO v_belongs_to_academy;

  IF NOT v_belongs_to_academy THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El alumno no pertenece a una de tus academias',
      'code', 'UNAUTHORIZED'
    );
  END IF;

  -- 5. Guardar auth_user_id para retornarlo al caller (Server Action lo usará para Admin API)
  v_auth_user_id := v_practitioner.auth_user_id;

  -- 6. Desactivar membresías de academia
  UPDATE academy_memberships
  SET is_active = false,
      left_at = CURRENT_DATE
  WHERE practitioner_id = p_practitioner_id
    AND is_active = true;

  GET DIAGNOSTICS v_deactivated_memberships = ROW_COUNT;

  -- 7. Revocar certificaciones
  UPDATE certifications
  SET is_revoked = true
  WHERE practitioner_id = p_practitioner_id
    AND is_revoked = false;

  GET DIAGNOSTICS v_revoked_certs = ROW_COUNT;

  -- 8. Desactivar grados de disciplinas
  UPDATE discipline_grades
  SET is_active = false
  WHERE practitioner_id = p_practitioner_id
    AND is_active = true;

  GET DIAGNOSTICS v_deactivated_disciplines = ROW_COUNT;

  -- 9. Marcar practicante como inactivo (soft delete) y limpiar referencia a auth
  UPDATE practitioners
  SET is_active = false,
      deactivated_at = now(),
      deactivation_reason = 'Eliminado por instructor: ' || p_instructor_id::text,
      auth_user_id = NULL
  WHERE id = p_practitioner_id;

  -- 10. Retornar resultado con auth_user_id para que el Server Action elimine de auth.users
  --     via Admin API (único método confiable en Supabase hosted)
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'practitioner_id', p_practitioner_id,
      'auth_user_id', v_auth_user_id,
      'deactivated_memberships', v_deactivated_memberships,
      'revoked_certifications', v_revoked_certs,
      'deactivated_disciplines', v_deactivated_disciplines
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'INTERNAL_ERROR'
    );
END;
$$;

-- Revocar acceso público por defecto
REVOKE ALL ON FUNCTION public.delete_practitioner_by_instructor FROM PUBLIC;

-- Permitir que usuarios autenticados ejecuten la función
GRANT EXECUTE ON FUNCTION public.delete_practitioner_by_instructor TO authenticated;

COMMENT ON FUNCTION public.delete_practitioner_by_instructor IS
'Desactiva un practicante y todos sus registros relacionados en el esquema public.
Retorna el auth_user_id para que el Server Action lo elimine via Supabase Admin API.
La eliminación de auth.users NO se hace aquí — debe hacerse desde el Server Action
usando adminSupabase.auth.admin.deleteUser() para garantizar limpieza completa
de sesiones, tokens y demás datos del esquema auth.
Validaciones:
- El usuario autenticado debe ser el instructor especificado
- El instructor debe haber registrado al practicante (instructor_id)
- El practicante debe pertenecer a una academia del instructor
Acciones en public:
- Marca is_active = false en practitioners + limpia auth_user_id
- Marca is_active = false en academy_memberships
- Revoca certificaciones (is_revoked = true)
- Desactiva grados de disciplinas (is_active = false)';
