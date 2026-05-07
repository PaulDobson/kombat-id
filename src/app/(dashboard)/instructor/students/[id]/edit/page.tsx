import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { EditStudentForm } from "./EditStudentForm";

const INSTRUCTOR_ROLES = ["instructor", "profesor", "maestro"];

interface StudentEditData {
  publicId: string;
  weightKg: number | null;
  heightCm: number | null;
  contactPhone: string | null;
  contactEmail: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressRegion: string | null;
}

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  // Verify the viewer is an instructor
  const { data: instructor } = await adminSupabase
    .from("practitioners")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!instructor || !INSTRUCTOR_ROLES.includes(instructor.role ?? "")) {
    redirect("/dashboard");
  }

  const practitionerRepo = new DrizzlePractitionerRepository();
  const practitioner = await practitionerRepo.findById(id);

  if (!practitioner) notFound();

  // Verify this student belongs to the instructor
  const isDirectStudent = practitioner.instructorId === instructor.id;

  let isAcademyStudent = false;
  if (!isDirectStudent) {
    // Check if the student is in any academy where this instructor is responsible
    const { data: studentMemberships } = await adminSupabase
      .from("academy_memberships")
      .select("academy_id")
      .eq("practitioner_id", id)
      .eq("is_active", true);

    const studentAcademyIds = (studentMemberships ?? []).map(
      (m: { academy_id: string }) => m.academy_id,
    );

    if (studentAcademyIds.length > 0) {
      const { data: instructorAcademies } = await adminSupabase
        .from("academies")
        .select("id")
        .contains("responsible_instructor_ids", [instructor.id])
        .in("id", studentAcademyIds);

      isAcademyStudent = (instructorAcademies ?? []).length > 0;
    }
  }

  if (!isDirectStudent && !isAcademyStudent) {
    redirect("/instructor");
  }

  // Build the DTO with only the editable fields — no sensitive data
  const studentEditData: StudentEditData = {
    publicId: practitioner.id,
    weightKg: practitioner.weightKg ?? null,
    heightCm: practitioner.heightCm ?? null,
    contactPhone: practitioner.contactPhone ?? null,
    contactEmail: practitioner.contactEmail ?? null,
    addressStreet: practitioner.addressStreet ?? null,
    addressCity: practitioner.addressCity ?? null,
    addressRegion: practitioner.addressRegion ?? null,
  };

  const backHref = `/instructor/students/${id}`;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        ← Volver al alumno
      </Link>

      {/* Header */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Editar alumno
        </h1>
        <p className="text-sm text-neutral-400 mt-1">{practitioner.fullName}</p>
      </div>

      {/* Form card */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <EditStudentForm student={studentEditData} backHref={backHref} />
      </div>
    </main>
  );
}
