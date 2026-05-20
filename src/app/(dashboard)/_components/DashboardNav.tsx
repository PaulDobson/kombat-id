import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { NavLink } from "./NavLink";
import { NavDropdown } from "./NavDropdown";
import { UserMenu } from "./UserMenu";

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

  // For instructors: fetch their academies to build the nav dropdown
  let instructorAcademyItems: { href: string; label: string }[] = [];
  if (isInstructor && practitioner) {
    const { data: academyRows } = await adminSupabase
      .from("academies")
      .select("id, name")
      .contains("responsible_instructor_ids", [practitioner.id])
      .eq("is_active", true)
      .order("name")
      .limit(10);

    instructorAcademyItems = (academyRows ?? []).map(
      (a: { id: string; name: string }) => ({
        href: `/instructor/academies/${a.id}`,
        label: a.name,
      }),
    );
  }

  const initials = practitioner
    ? practitioner.fullName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : null;

  return (
    <header
      className={`border-b backdrop-blur-sm sticky top-0 z-30 ${
        isAdmin
          ? "border-indigo-900/60 bg-indigo-950/95"
          : "border-neutral-800/60 bg-neutral-950/95"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
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
              <NavDropdown
                label="Academia"
                items={[
                  {
                    href: "/admin/practitioners",
                    label: "Practicantes",
                  },
                  {
                    href: "/admin/practitioners/pending-activation",
                    label: "Activaciones",
                  },
                  { href: "/admin/academies", label: "Academias" },
                  { separator: true },
                  {
                    href: "/admin/certification-requests",
                    label: "Solicitudes de certificación",
                  },
                  {
                    href: "/admin/instructor-requests",
                    label: "Solicitudes de instructores",
                  },
                ]}
              />
              <NavDropdown
                label="Exámenes"
                items={[
                  { href: "/admin/exam-templates", label: "Pautas" },
                  { href: "/admin/grade-exams", label: "Aprobaciones" },
                ]}
              />
              <NavLink href="/admin/events">Eventos</NavLink>
              <NavDropdown
                label="Árbitros"
                items={[
                  { href: "/admin/referees", label: "Lista de árbitros" },
                  {
                    href: "/admin/referee-registrations",
                    label: "Solicitudes de registro",
                  },
                ]}
              />
            </>
          ) : isInstructor ? (
            <>
              <NavLink href="/instructor" exact>
                Panel Principal
              </NavLink>
              <NavLink href="/instructor/events">Eventos</NavLink>
              <NavLink href="/instructor/grade-exams">Exámenes</NavLink>
              <NavDropdown
                label="Academia"
                items={[
                  ...instructorAcademyItems,
                  {
                    href: "/instructor/academies/new",
                    label: "+ Crear academia",
                  },
                ]}
              />
              <NavLink href="/certifications">Certificaciones</NavLink>
            </>
          ) : (
            <>
              <NavLink href="/dashboard">Inicio</NavLink>
              <NavLink href="/martial-history">Historial</NavLink>
              <NavLink href="/ranking">Ranking</NavLink>
              <NavLink href="/certifications">Certificaciones</NavLink>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {isAdmin ? (
            <>
              <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-indigo-900/30 border border-indigo-700/40">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">
                    {user.email?.[0]?.toUpperCase() ?? "A"}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-[10px] font-semibold text-indigo-300 leading-none">
                    Administrador
                  </p>
                  <p className="text-[10px] text-indigo-500 leading-none mt-0.5 truncate max-w-35">
                    {user.email}
                  </p>
                </div>
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="text-xs text-indigo-400/70 hover:text-neutral-200 transition-colors duration-150 px-2 py-1.5 rounded-md hover:bg-indigo-900/40 border border-transparent hover:border-indigo-800/50"
                >
                  Salir
                </button>
              </form>
            </>
          ) : (
            <>
              {practitioner && (
                <UserMenu
                  profileHref={
                    isInstructor ? "/instructor/profile" : "/profile"
                  }
                  name={practitioner.fullName.split(" ")[0]!}
                  gradeLabel={gradeLabel}
                  initials={initials}
                  signOutAction={signOutAction}
                />
              )}
              {!practitioner && (
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="text-xs text-neutral-500 hover:text-neutral-200 transition-colors duration-150 px-2 py-1.5 rounded-md hover:bg-neutral-800/60 border border-transparent hover:border-neutral-700/50"
                  >
                    Salir
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
