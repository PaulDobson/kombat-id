import { adminSupabase } from "@/lib/supabase/admin";

/**
 * Verifies that an instructor has access to a given student.
 *
 * Access is granted when:
 * 1. The student has `instructor_id` pointing directly to this instructor, OR
 * 2. The student has an active membership in any academy where this instructor
 *    is listed as a responsible instructor.
 *
 * Returns true if access is granted, false otherwise.
 */
export async function verifyInstructorStudentAccess({
  instructorId,
  studentId,
  studentInstructorId,
}: {
  instructorId: string;
  studentId: string;
  /** Optional: pass the student's instructor_id if already fetched, to avoid an extra query */
  studentInstructorId?: string | null;
}): Promise<boolean> {
  // Fast path: direct instructor assignment
  if (studentInstructorId !== undefined) {
    if (studentInstructorId === instructorId) return true;
  } else {
    const { data: studentRow } = await adminSupabase
      .from("practitioners")
      .select("instructor_id")
      .eq("id", studentId)
      .maybeSingle();
    if (studentRow?.instructor_id === instructorId) return true;
  }

  // Slow path: check academy membership overlap
  const { data: studentMemberships } = await adminSupabase
    .from("academy_memberships")
    .select("academy_id")
    .eq("practitioner_id", studentId)
    .eq("is_active", true);

  const studentAcademyIds = (studentMemberships ?? []).map(
    (m: { academy_id: string }) => m.academy_id,
  );

  if (studentAcademyIds.length === 0) return false;

  const { data: instructorAcademies } = await adminSupabase
    .from("academies")
    .select("id")
    .contains("responsible_instructor_ids", [instructorId])
    .in("id", studentAcademyIds);

  return (instructorAcademies ?? []).length > 0;
}
