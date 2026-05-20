"use server";

import { adminSupabase } from "@/lib/supabase/admin";

export interface PractitionerSummary {
  id: string;
  fullName: string;
  rut: string;
  birthDate: string;
  grade: string;
  dan: number | null;
  gender: string;
  role: string;
  isActive: boolean;
  weightKg: number | null;
  heightCm: number | null;
}

export async function getPractitionerSummary(
  practitionerId: string,
): Promise<PractitionerSummary | null> {
  const { data } = await adminSupabase
    .from("practitioners")
    .select(
      "id, full_name, rut, birth_date, grade, dan, gender, role, is_active, weight_kg, height_cm",
    )
    .eq("id", practitionerId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    rut: data.rut,
    birthDate: data.birth_date,
    grade: data.grade,
    dan: data.dan,
    gender: data.gender,
    role: data.role,
    isActive: data.is_active,
    weightKg: data.weight_kg,
    heightCm: data.height_cm,
  };
}
