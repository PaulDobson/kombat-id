import { redirect, notFound } from "next/navigation";
import { adminSupabase } from "@/lib/supabase/admin";
import { DrizzleExamTemplateRepository } from "@/modules/grade-exam/infrastructure/repositories/drizzleExamTemplateRepository";
import { EditExamTemplateForm } from "./EditExamTemplateForm";
import { requireAdmin } from "@/lib/auth-guards";

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Page (server component)
// ---------------------------------------------------------------------------

export default async function EditExamTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  await requireAdmin();
  const { templateId } = await params;

  const repo = new DrizzleExamTemplateRepository();
  const template = await repo.findById(templateId);
  if (!template) notFound();

  return <EditExamTemplateForm template={template} />;
}
