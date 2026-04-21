import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DrizzleExamTemplateRepository } from "@/modules/grade-exam/infrastructure/repositories/drizzleExamTemplateRepository";

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

export default async function AdminExamTemplatesPage() {
  await requireAdminUser();

  const repo = new DrizzleExamTemplateRepository();
  const templates = await repo.findAll();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Pautas de evaluación
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            {templates.length} pauta{templates.length !== 1 ? "s" : ""}{" "}
            configurada{templates.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/exam-templates/new"
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nueva pauta
        </Link>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        {templates.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-500 text-sm">
              No hay pautas de evaluación configuradas.
            </p>
            <Link
              href="/admin/exam-templates/new"
              className="inline-block mt-3 text-primary-400 hover:text-primary-300 text-sm transition-colors"
            >
              Crear la primera →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-900/80">
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Transición
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                    Disciplina
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Puntaje mínimo (%)
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                    Requiere auth
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                    N° ítems
                  </th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {templates.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-neutral-100 font-medium whitespace-nowrap">
                      {GRADE_LABELS[t.fromGrade] ?? t.fromGrade}
                      {" → "}
                      {GRADE_LABELS[t.toGrade] ?? t.toGrade}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 text-xs hidden sm:table-cell">
                      {t.discipline}
                    </td>
                    <td className="px-4 py-3 text-neutral-300 tabular-nums">
                      {t.minimumPassScore}%
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {t.requiresAdminAuth ? (
                        <span className="text-amber-400 text-xs">Sí</span>
                      ) : (
                        <span className="text-neutral-500 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {t.isActive ? (
                        <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full text-xs">
                          Activa
                        </span>
                      ) : (
                        <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
                          Inactiva
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 tabular-nums text-xs hidden sm:table-cell">
                      {t.items.length}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/exam-templates/${t.id}`}
                        className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
