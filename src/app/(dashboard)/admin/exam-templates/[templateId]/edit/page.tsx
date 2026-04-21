import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DrizzleExamTemplateRepository } from "@/modules/grade-exam/infrastructure/repositories/drizzleExamTemplateRepository";
import { EditExamTemplateForm } from "./EditExamTemplateForm";

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await adminSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) redirect("/dashboard");
  return user;
}

// ---------------------------------------------------------------------------
// Page (server component)
// ---------------------------------------------------------------------------

export default async function EditExamTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  await requireAdminUser();
  const { templateId } = await params;

  const repo = new DrizzleExamTemplateRepository();
  const template = await repo.findById(templateId);
  if (!template) notFound();

  return <EditExamTemplateForm template={template} />;
}
