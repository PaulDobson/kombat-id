import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const repo = new DrizzlePractitionerRepository();
  const practitioner = await repo.findByAuthUserId(user.id);

  const { data: adminData } = await adminSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = !!adminData;

  const gradeLabel = practitioner
    ? `${GRADE_LABELS[practitioner.grade] ?? practitioner.grade}${practitioner.dan ? ` ${practitioner.dan}° Dan` : ""}`
    : null;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Top nav */}
      <header className="border-b border-neutral-800 bg-neutral-950 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 shrink-0"
          >
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs" aria-hidden="true">
                KT
              </span>
            </div>
            <span className="font-semibold text-neutral-50 text-sm tracking-tight hidden sm:block">
              Kombat Taekwondo
            </span>
          </Link>

          <nav
            className="flex items-center gap-1 overflow-x-auto"
            aria-label="Navegación principal"
          >
            <NavLink href="/dashboard">Inicio</NavLink>
            <NavLink href="/profile">Mi Perfil</NavLink>
            <NavLink href="/martial-history">Historial</NavLink>
            <NavLink href="/ranking">Ranking</NavLink>
            <NavLink href="/certifications">Certificaciones</NavLink>
            {isAdmin && (
              <NavLink href="/admin/practitioners" highlight>
                Admin
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {practitioner && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs font-medium text-neutral-200 leading-none">
                  {practitioner.fullName.split(" ")[0]}
                </span>
                <span className="text-xs text-neutral-500 leading-none mt-0.5">
                  {gradeLabel}
                </span>
              </div>
            )}
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors px-2 py-1"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Page content */}
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  children,
  highlight,
}: {
  href: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        highlight
          ? "text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors whitespace-nowrap"
          : "text-xs font-medium px-3 py-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors whitespace-nowrap"
      }
    >
      {children}
    </Link>
  );
}
