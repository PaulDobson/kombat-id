import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { DrizzleExamTemplateRepository } from "@/modules/grade-exam/infrastructure/repositories/drizzleExamTemplateRepository";
import { DeactivateTemplateButton } from "./DeactivateTemplateButton";

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
// Constants
// ---------------------------------------------------------------------------

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ExamTemplateDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  await requireAdminUser();
  const { templateId } = await params;

  const repo = new DrizzleExamTemplateRepository();
  const template = await repo.findById(templateId);
  if (!template) notFound();

  const createdAt = new Date(template.createdAt).toLocaleDateString("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/admin/exam-templates"
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver al listado
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-semibold text-neutral-50 tracking-tight">
            {GRADE_LABELS[template.fromGrade] ?? template.fromGrade}
            {" → "}
            {GRADE_LABELS[template.toGrade] ?? template.toGrade}
          </h1>
          {template.isActive ? (
            <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full text-xs">
              Activa
            </span>
          ) : (
            <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
              Inactiva
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/exam-templates/${templateId}/edit`}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Editar
        </Link>
      </div>

      {/* Template details */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-neutral-50 mb-4">
          Datos de la pauta
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Transición
            </dt>
            <dd className="text-neutral-200">
              {GRADE_LABELS[template.fromGrade] ?? template.fromGrade}
              {" → "}
              {GRADE_LABELS[template.toGrade] ?? template.toGrade}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Disciplina
            </dt>
            <dd className="text-neutral-200">{template.discipline}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Puntaje mínimo
            </dt>
            <dd className="text-neutral-200">{template.minimumPassScore}%</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Requiere autorización admin
            </dt>
            <dd>
              {template.requiresAdminAuth ? (
                <span className="text-amber-400">Sí</span>
              ) : (
                <span className="text-neutral-400">No</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Estado
            </dt>
            <dd>
              {template.isActive ? (
                <span className="text-emerald-400">Activa</span>
              ) : (
                <span className="text-neutral-400">Inactiva</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Creada
            </dt>
            <dd className="text-neutral-200">{createdAt}</dd>
          </div>
        </dl>
      </div>

      {/* Items table */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-50">
            Ítems de evaluación
          </h2>
          <span className="text-xs text-neutral-400">
            {template.items.length} ítem{template.items.length !== 1 ? "s" : ""}
          </span>
        </div>

        {template.items.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-neutral-500 text-sm">
              Esta pauta no tiene ítems configurados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-900/80">
                  <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider w-16">
                    Orden
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                    Descripción
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider w-32">
                    Puntaje máximo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {template.items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="px-5 py-3 text-neutral-400 tabular-nums text-xs">
                      {item.order + 1}
                    </td>
                    <td className="px-5 py-3 text-neutral-100 font-medium">
                      {item.name}
                    </td>
                    <td className="px-5 py-3 text-neutral-400 text-xs hidden sm:table-cell">
                      {item.description ?? (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-neutral-300 tabular-nums text-right">
                      {item.maxScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Danger zone */}
      {template.isActive && (
        <div className="bg-neutral-900 border border-rose-500/20 rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-rose-400">
            Zona de peligro
          </h2>
          <p className="text-xs text-neutral-500">
            Desactivar esta pauta impedirá que se use para nuevos exámenes. Los
            exámenes existentes no se verán afectados.
          </p>
          <DeactivateTemplateButton templateId={templateId} />
        </div>
      )}
    </main>
  );
}
