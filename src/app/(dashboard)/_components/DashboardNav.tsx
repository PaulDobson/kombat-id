import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { NavLink } from "./NavLink";
import { NavDropdown } from "./NavDropdown";
import { UserMenu } from "./UserMenu";
import {
  DashboardMobileNav,
  type MobileNavSection,
} from "./DashboardMobileNav";
import { NotificationBell } from "@/modules/notifications/presentation/components/NotificationBell";
import {
  getPractitionerByAuthUserId,
  getIsAdmin,
  getInstructorAcademyItems,
} from "@/lib/request-cache";

const ROLE_LABELS: Record<string, string> = {
  alumno: "Alumno",
  instructor: "Instructor",
  profesor: "Profesor",
  maestro: "Maestro",
};

export async function DashboardNav() {
  const user = await requireUser();

  // Use React.cache() deduped helpers — if DashboardNav and the page both call
  // these functions in the same request, only one DB query fires per function.
  const [practitionerRow, isAdmin] = await Promise.all([
    getPractitionerByAuthUserId(user.id),
    getIsAdmin(user.id),
  ]);

  const roleLabel = practitionerRow
    ? (ROLE_LABELS[practitionerRow.role ?? ""] ?? practitionerRow.role ?? null)
    : null;

  const isInstructor =
    practitionerRow &&
    ["instructor", "profesor", "maestro"].includes(practitionerRow.role ?? "");

  // For instructors: fetch their academies to build the nav dropdown
  let instructorAcademyItems: {
    href: string;
    label: string;
    subItems: { href: string; label: string }[];
  }[] = [];
  let instructorAcademyMobileItems: { href: string; label: string }[] = [];
  if (isInstructor && practitionerRow) {
    const academyRows = await getInstructorAcademyItems(practitionerRow.id);
    instructorAcademyItems = academyRows.map((a) => ({
      href: `/instructor/academies/${a.id}`,
      label: a.name,
      subItems: [
        {
          href: `/instructor/academies/${a.id}?section=register`,
          label: "Registrar Alumnos",
        },
      ],
    }));
    // Mobile: flat list with both links per academy
    instructorAcademyMobileItems = academyRows.flatMap((a) => [
      { href: `/instructor/academies/${a.id}`, label: a.name },
      {
        href: `/instructor/academies/${a.id}?section=register`,
        label: `↳ Registrar Alumnos — ${a.name}`,
      },
    ]);
  }

  const initials = practitionerRow
    ? practitionerRow.full_name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : null;

  // ── Secciones de navegación para el menú móvil ────────────────────────
  const mobileSections: MobileNavSection[] = isAdmin
    ? [
        {
          items: [{ href: "/admin/dashboard", label: "Panel" }],
        },
        {
          title: "Academia",
          items: [
            { href: "/admin/practitioners", label: "Practicantes" },
            {
              href: "/admin/practitioners/pending-activation",
              label: "Activaciones",
            },
            { href: "/admin/academies", label: "Academias" },
            {
              href: "/admin/certification-requests",
              label: "Solicitudes de certificación",
            },
            {
              href: "/admin/instructor-requests",
              label: "Solicitudes de instructores",
            },
          ],
        },
        {
          title: "Exámenes",
          items: [
            { href: "/admin/exam-templates", label: "Pautas" },
            { href: "/admin/grade-exams", label: "Aprobaciones" },
          ],
        },
        {
          items: [{ href: "/admin/events", label: "Eventos" }],
        },
        {
          title: "Árbitros",
          items: [
            { href: "/admin/referees", label: "Lista de árbitros" },
            {
              href: "/admin/referee-registrations",
              label: "Solicitudes de registro",
            },
            {
              href: "/admin/referee-registrations/publications",
              label: "Crear publicación",
            },
          ],
        },
      ]
    : isInstructor
      ? [
          {
            items: [
              { href: "/instructor", label: "Panel Principal" },
              { href: "/instructor/events", label: "Eventos" },
              { href: "/instructor/grade-exams", label: "Exámenes" },
              { href: "/certifications", label: "Certificaciones" },
            ],
          },
          {
            title: "Academia",
            items: [
              ...instructorAcademyMobileItems,
              {
                href: "/instructor/academies/new",
                label: "+ Crear academia",
              },
            ],
          },
        ]
      : [
          {
            items: [
              { href: "/dashboard", label: "Inicio" },
              { href: "/martial-history", label: "Historial" },
              { href: "/ranking", label: "Ranking" },
              { href: "/certifications", label: "Certificaciones" },
            ],
          },
        ];

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
          className="hidden md:flex items-center gap-1 overflow-visible"
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
                  {
                    href: "/admin/referee-registrations/publications",
                    label: "Crear publicación",
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
          <NotificationBell />
          {isAdmin ? (
            <>
              <div className="hidden md:flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-indigo-900/30 border border-indigo-700/40">
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
              <form action={signOutAction} className="hidden md:block">
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
              {practitionerRow && (
                <UserMenu
                  profileHref={
                    isInstructor ? "/instructor/profile" : "/profile"
                  }
                  name={practitionerRow.full_name.split(" ")[0]!}
                  gradeLabel={roleLabel}
                  initials={initials}
                  signOutAction={signOutAction}
                />
              )}
              {!practitionerRow && (
                <form action={signOutAction} className="hidden md:block">
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
          <DashboardMobileNav
            sections={mobileSections}
            signOutAction={signOutAction}
            isAdmin={isAdmin}
            userEmail={user.email ?? null}
            userName={practitionerRow?.full_name.split(" ")[0] ?? null}
            userInitials={initials}
            roleLabel={roleLabel}
            profileHref={isInstructor ? "/instructor/profile" : "/profile"}
          />
        </div>
      </div>
    </header>
  );
}
