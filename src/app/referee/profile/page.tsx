// Server Component — no "use client"

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SupabaseRefereeRegistrationRepository } from "@/modules/referee-registration/infrastructure/repositories/supabaseRefereeRegistrationRepository";
import { getRefereeProfile } from "@/modules/referee-registration/application/use-cases/getRefereeProfile";
import { RefereeProfileCard } from "./RefereeProfileCard";

export const metadata = {
  title: "Mi Perfil — Portal de Árbitros",
};

export default async function RefereeProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const repo = new SupabaseRefereeRegistrationRepository();

  let registration;
  try {
    registration = await getRefereeProfile(user.id, { repo });
  } catch {
    redirect("/referee/dashboard");
  }

  // Serialize to plain object — no class instances cross the server/client boundary
  const profile = {
    id: registration.id,
    fullName: registration.fullName,
    email: registration.email,
    country: registration.country,
    registrationNumber: registration.registrationNumber,
    status: registration.status,
    approvedAt: registration.approvedAt,
    createdAt: registration.createdAt,
    updatedAt: registration.updatedAt,
    hasCertificate: registration.certificatePath !== null,
  };

  return <RefereeProfileCard profile={profile} />;
}
