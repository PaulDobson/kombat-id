import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { NavLink } from "./NavLink";
import { NavDropdown } from "./NavDropdown";

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

export async function DashboardNav() {
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

  const isInstructor =
    practitioner &&
    ["instructor", "profesor", "maestro"].includes(practitioner.role ?? "");

  return (
    <header className="border-b border-neutral-800 bg-neutral-950 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/KombatLogoSquare.webp"
              alt="Kombat Taekwondo"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-semibold text-neutral-50 text-sm tracking-tight hidden sm:block">
            Kombat Taekwondo
          </span>
        </Link>

        <nav
          className="flex items-center gap-1 overflow-visible"
          aria-label="Navegación principal"
        >
          {isAdmin ? (
            <>
              <NavLink href="/admin/dashboard">Panel</NavLink>
              <NavLink href="/admin/practitioners">Practicantes</NavLink>
              <NavLink href="/admin/academies">Academias</NavLink>
              <NavLink href="/admin/events">Eventos</NavLink>
              <NavLink href="/admin/certification-requests">
                Solicitudes
              </NavLink>
              <NavDropdown
                label="Exámanes"
                items={[
                  { href: "/admin/exam-templates", label: "Pautas" },
                  { href: "/admin/grade-exams", label: "Aprobaciones" },
                ]}
              />
              <NavLink href="/admin/referees">Lista de árbitros</NavLink>
            </>
          ) : isInstructor ? (
            <>
              <NavLink href="/dashboard">Inicio</NavLink>
              <NavLink href="/instructor">Mis alumnos</NavLink>
              <NavLink href="/instructor/events">Eventos</NavLink>
              <NavLink href="/instructor/grade-exams">Exámenes</NavLink>
              <NavLink href="/profile">Mi Perfil</NavLink>
              <NavLink href="/certifications">Certificaciones</NavLink>
            </>
          ) : (
            <>
              <NavLink href="/dashboard">Inicio</NavLink>
              <NavLink href="/profile">Mi Perfil</NavLink>
              <NavLink href="/martial-history">Historial</NavLink>
              <NavLink href="/ranking">Ranking</NavLink>
              <NavLink href="/certifications">Certificaciones</NavLink>
            </>
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
  );
}
