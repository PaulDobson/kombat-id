import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { DrizzleAcademyRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleAcademyRepository";
import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";
import type { Grade } from "@/modules/practitioner-identity/domain/entities/practitioner";
import { isInstructorRole } from "@/lib/roles";
import Link from "next/link";
import { RemoveMemberButton } from "./RemoveMemberButton";
import { EditAcademyForm } from "./EditAcademyForm";
import { RegisterStudentSection } from "./RegisterStudentSection";
import { EditStudentModal } from "./EditStudentModal";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Settings2,
  Info,
  Eye,
  GraduationCap,
  Mail,
  Phone,
  MessageCircle,
  Globe,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { GRADE_LABELS, GRADE_STYLES } from "@/lib/presentation-constants";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

const REGION_LABELS: Record<ChileanRegion, string> = {
  arica_y_parinacota: "Arica y Parinacota",
  tarapaca: "Tarapacá",
  antofagasta: "Antofagasta",
  atacama: "Atacama",
  coquimbo: "Coquimbo",
  valparaiso: "Valparaíso",
  metropolitana: "Metropolitana",
  ohiggins: "O'Higgins",
  maule: "Maule",
  nuble: "Ñuble",
  biobio: "Biobío",
  araucania: "Araucanía",
  los_rios: "Los Ríos",
  los_lagos: "Los Lagos",
  aysen: "Aysén",
  magallanes: "Magallanes",
};

const GRADE_BAR_COLOR: Record<Grade, string> = {
  white: "bg-neutral-400",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  red: "bg-red-500",
  black: "bg-neutral-800",
};

const GRADE_ORDER: Grade[] = [
  "white",
  "yellow",
  "green",
  "blue",
  "red",
  "black",
];

type TabType = "overview" | "students" | "settings";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function InstructorAcademyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ academyId: string }>;
  searchParams: Promise<{
    page?: string;
    tab?: string;
    q?: string;
    inactive?: string;
    section?: string;
  }>;
}) {
  const user = await requireUser();
  const { academyId } = await params;
  const sp = await searchParams;

  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!practitioner || !isInstructorRole(practitioner.role as string)) {
    redirect("/instructor");
  }

  const practitionerId = practitioner.id as string;

  const academyRepo = new DrizzleAcademyRepository();
  const academy = await academyRepo.findById(academyId);

  if (!academy) notFound();
  if (!academy.responsibleInstructorIds.includes(practitionerId)) {
    redirect("/instructor");
  }

  // Determine active tab — default to overview
  const activeTab: TabType =
    sp.tab === "students"
      ? "students"
      : sp.tab === "settings"
        ? "settings"
        : "overview";

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const searchQuery = sp.q?.trim() ?? "";
  const showInactive = sp.inactive === "1";
  const offset = (page - 1) * PAGE_SIZE;

  // ── Stats: grade distribution + active/inactive counts (always needed) ──
  const { data: statsRows } = await adminSupabase
    .from("academy_memberships")
    .select("practitioners(grade, is_active, auth_user_id)")
    .eq("academy_id", academyId);

  const gradeCounts: Partial<Record<Grade, number>> = {};
  let activeCount = 0;
  let pendingCount = 0;

  for (const row of statsRows ?? []) {
    const p = (
      row as {
        practitioners: {
          grade: string;
          is_active: boolean;
          auth_user_id: string | null;
        } | null;
      }
    ).practitioners;
    if (!p) continue;
    const g = p.grade as Grade;
    gradeCounts[g] = (gradeCounts[g] ?? 0) + 1;
    if (p.is_active) activeCount++;
    if (!p.is_active && p.auth_user_id === null) pendingCount++;
  }

  const totalStatsCount = (statsRows ?? []).length;
  const inactiveCount = totalStatsCount - activeCount;

  // ── Paginated members (only needed on students tab) ─────────────────────
  let members: Array<{
    id: string;
    full_name: string;
    rut: string;
    grade: string;
    dan: number | null;
    address_city: string | null;
    address_street: string | null;
    address_region: string | null;
    weight_kg: number | null;
    height_cm: number | null;
    contact_phone: string | null;
    contact_email: string | null;
    is_active: boolean;
    auth_user_id: string | null;
  }> = [];
  let totalMemberCount = 0;
  let totalPages = 1;

  if (activeTab === "students") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const membersQuery: any = adminSupabase
      .from("academy_memberships")
      .select(
        "practitioner_id, practitioners(id, full_name, rut, grade, dan, address_city, address_street, address_region, weight_kg, height_cm, contact_phone, contact_email, is_active, auth_user_id)",
        { count: "exact" },
      )
      .eq("academy_id", academyId)
      .order("practitioner_id");

    // We need to filter by is_active on the practitioners table
    // Using the flat query pattern
    const { data: allMemberRows, count: allCount } = await adminSupabase
      .from("academy_memberships")
      .select(
        "practitioner_id, practitioners!inner(id, full_name, rut, grade, dan, address_city, address_street, address_region, weight_kg, height_cm, contact_phone, contact_email, is_active, auth_user_id)",
        { count: "exact" },
      )
      .eq("academy_id", academyId)
      .eq("practitioners.is_active", !showInactive)
      .order("practitioner_id")
      .range(offset, offset + PAGE_SIZE - 1);

    void membersQuery; // suppress unused warning

    totalMemberCount = allCount ?? 0;
    totalPages = Math.ceil(totalMemberCount / PAGE_SIZE);

    type MemberRow = {
      practitioner_id: string;
      practitioners: {
        id: string;
        full_name: string;
        rut: string;
        grade: string;
        dan: number | null;
        address_city: string | null;
        address_street: string | null;
        address_region: string | null;
        weight_kg: number | null;
        height_cm: number | null;
        contact_phone: string | null;
        contact_email: string | null;
        is_active: boolean;
        auth_user_id: string | null;
      } | null;
    };

    members = (allMemberRows ?? [])
      .map((r) => (r as MemberRow).practitioners)
      .filter(Boolean) as NonNullable<MemberRow["practitioners"]>[];

    // Filter by name search
    if (searchQuery) {
      members = members.filter((m) =>
        m.full_name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
  }

  const tabUrl = (tab: TabType, extra?: Record<string, string>) => {
    const params = new URLSearchParams({ tab });
    if (extra) {
      for (const [k, v] of Object.entries(extra)) params.set(k, v);
    }
    return `/instructor/academies/${academyId}?${params.toString()}`;
  };

  const pageUrl = (p: number) => {
    const params = new URLSearchParams({ tab: "students", page: String(p) });
    if (searchQuery) params.set("q", searchQuery);
    if (showInactive) params.set("inactive", "1");
    return `/instructor/academies/${academyId}?${params.toString()}`;
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Link
          href="/instructor"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al panel
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-semibold text-neutral-50 tracking-tight">
                  {academy.name}
                </h1>
                {academy.isActive ? (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Activa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-neutral-800 text-neutral-400 border border-neutral-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                    Inactiva
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5">
                <MapPin className="w-3 h-3" />
                {academy.city}
                {academy.region
                  ? `, ${REGION_LABELS[academy.region] ?? academy.region}`
                  : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Attention banner (pending activations) ───────────────────────── */}
      {pendingCount > 0 && activeTab !== "students" && (
        <Link
          href={tabUrl("students", { inactive: "1" })}
          className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 hover:bg-amber-500/10 transition-colors group"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300 flex-1">
            {pendingCount} alumno{pendingCount !== 1 ? "s" : ""} pendiente
            {pendingCount !== 1 ? "s" : ""} de activación
          </p>
          <span className="text-xs text-amber-400/60 group-hover:text-amber-400 transition-colors">
            Ver →
          </span>
        </Link>
      )}

      {/* ── Tab navigation ────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-800">
        <nav className="flex items-center gap-0 -mb-px">
          {/* Tab: Información */}
          <Link
            href={tabUrl("overview")}
            className={`
              group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
              ${
                activeTab === "overview"
                  ? "text-neutral-50 border-b-2 border-primary-500"
                  : "text-neutral-400 hover:text-neutral-200 border-b-2 border-transparent"
              }
            `}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>Información</span>
          </Link>

          {/* Tab: Alumnos */}
          <Link
            href={tabUrl("students")}
            className={`
              group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
              ${
                activeTab === "students"
                  ? "text-neutral-50 border-b-2 border-primary-500"
                  : "text-neutral-400 hover:text-neutral-200 border-b-2 border-transparent"
              }
            `}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Alumnos</span>
            <span
              className={`
                inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold tabular-nums
                ${
                  activeTab === "students"
                    ? "bg-primary-500/20 text-primary-300"
                    : "bg-neutral-800 text-neutral-400"
                }
                ${pendingCount > 0 ? "ring-1 ring-amber-500/40" : ""}
              `}
            >
              {totalStatsCount}
            </span>
            {pendingCount > 0 && (
              <span
                className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
                title={`${pendingCount} pendientes`}
              />
            )}
          </Link>

          {/* Tab: Configuración */}
          <Link
            href={tabUrl("settings")}
            className={`
              group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
              ${
                activeTab === "settings"
                  ? "text-neutral-50 border-b-2 border-primary-500"
                  : "text-neutral-400 hover:text-neutral-200 border-b-2 border-transparent"
              }
            `}
          >
            <Settings2 className="w-4 h-4 shrink-0" />
            <span>Configuración</span>
          </Link>
        </nav>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: INFORMACIÓN
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* ── Stat cards ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-50 tabular-nums">
                  {totalStatsCount}
                </p>
                <p className="text-xs text-neutral-500">Total</p>
              </div>
            </div>
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-50 tabular-nums">
                  {activeCount}
                </p>
                <p className="text-xs text-neutral-500">Activos</p>
              </div>
            </div>
            <div
              className={`bg-neutral-900 border rounded-2xl p-4 flex items-center gap-3 ${
                pendingCount > 0 ? "border-amber-500/30" : "border-neutral-700"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  pendingCount > 0 ? "bg-amber-500/10" : "bg-neutral-700/60"
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 ${pendingCount > 0 ? "text-amber-400" : "text-neutral-500"}`}
                />
              </div>
              <div>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    pendingCount > 0 ? "text-amber-400" : "text-neutral-50"
                  }`}
                >
                  {pendingCount}
                </p>
                <p className="text-xs text-neutral-500">Pendientes</p>
              </div>
            </div>
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <UserX className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-50 tabular-nums">
                  {inactiveCount}
                </p>
                <p className="text-xs text-neutral-500">Inactivos</p>
              </div>
            </div>
          </div>

          {/* ── Grade distribution ──────────────────────────────────────── */}
          {totalStatsCount > 0 && (
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Distribución por grado
              </p>
              <div className="flex h-3 rounded-full overflow-hidden gap-px">
                {GRADE_ORDER.map((g) => {
                  const count = gradeCounts[g] ?? 0;
                  if (count === 0) return null;
                  const pct = (count / totalStatsCount) * 100;
                  return (
                    <div
                      key={g}
                      className={`${GRADE_BAR_COLOR[g]} transition-all`}
                      style={{ width: `${pct}%` }}
                      title={`${GRADE_LABELS[g]}: ${count}`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {GRADE_ORDER.map((g) => {
                  const count = gradeCounts[g] ?? 0;
                  if (count === 0) return null;
                  return (
                    <div
                      key={g}
                      className="flex items-center gap-1.5 text-xs text-neutral-400"
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-sm ${GRADE_BAR_COLOR[g]}`}
                      />
                      {GRADE_LABELS[g]}
                      <span className="text-neutral-500 tabular-nums">
                        ({count})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Info summary ────────────────────────────────────────────── */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-semibold text-neutral-100">
              Sobre la academia
            </h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div className="space-y-0.5">
                <dt className="text-xs text-neutral-500">Región</dt>
                <dd className="text-neutral-200 font-medium">
                  {REGION_LABELS[academy.region] ?? academy.region}
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-xs text-neutral-500">Ciudad</dt>
                <dd className="text-neutral-200 font-medium">{academy.city}</dd>
              </div>
              {academy.address && (
                <div className="space-y-0.5 col-span-2 sm:col-span-1">
                  <dt className="text-xs text-neutral-500">Dirección</dt>
                  <dd className="text-neutral-200 font-medium">
                    {academy.address}
                  </dd>
                </div>
              )}
              {academy.foundedDate && (
                <div className="space-y-0.5">
                  <dt className="text-xs text-neutral-500 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Fundada
                  </dt>
                  <dd className="text-neutral-200 font-medium">
                    {academy.foundedDate}
                  </dd>
                </div>
              )}
            </dl>

            {/* Description */}
            {academy.description && (
              <div className="border-t border-neutral-800 pt-4 space-y-1.5">
                <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">
                  Descripción
                </p>
                <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                  {academy.description}
                </p>
              </div>
            )}

            {/* Contact info */}
            {(academy.contactPhone ||
              academy.contactEmail ||
              academy.contactWhatsapp ||
              academy.contactInstagram ||
              academy.contactWebsite) && (
              <div className="border-t border-neutral-800 pt-4 space-y-2">
                <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">
                  Contacto
                </p>
                <div className="flex flex-wrap gap-3">
                  {academy.contactPhone && (
                    <a
                      href={`tel:${academy.contactPhone}`}
                      className="inline-flex items-center gap-1.5 text-sm text-neutral-300 hover:text-neutral-100 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      {academy.contactPhone}
                    </a>
                  )}
                  {academy.contactEmail && (
                    <a
                      href={`mailto:${academy.contactEmail}`}
                      className="inline-flex items-center gap-1.5 text-sm text-neutral-300 hover:text-neutral-100 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      {academy.contactEmail}
                    </a>
                  )}
                  {academy.contactWhatsapp && (
                    <a
                      href={`https://wa.me/${academy.contactWhatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-neutral-300 hover:text-neutral-100 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      WhatsApp
                    </a>
                  )}
                  {academy.contactInstagram && (
                    <a
                      href={`https://instagram.com/${academy.contactInstagram.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-neutral-300 hover:text-neutral-100 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-pink-400" />@
                      {academy.contactInstagram.replace(/^@/, "")}
                    </a>
                  )}
                  {academy.contactWebsite && (
                    <a
                      href={academy.contactWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-neutral-300 hover:text-neutral-100 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5 text-indigo-400" />
                      Sitio web
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Quick link to settings */}
            <div className="border-t border-neutral-800 pt-4">
              <Link
                href={tabUrl("settings")}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Editar información de la academia
              </Link>
            </div>
          </div>

          {/* ── Quick actions ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href={tabUrl("students")}
              className="flex items-center gap-3 bg-neutral-900 border border-neutral-700 hover:border-emerald-500/30 rounded-2xl p-4 transition-colors group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">
                  Gestionar alumnos
                </p>
                <p className="text-xs text-neutral-500">
                  {totalStatsCount} alumno{totalStatsCount !== 1 ? "s" : ""}{" "}
                  registrado{totalStatsCount !== 1 ? "s" : ""}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
            </Link>

            <Link
              href={tabUrl("settings")}
              className="flex items-center gap-3 bg-neutral-900 border border-neutral-700 hover:border-neutral-600 rounded-2xl p-4 transition-colors group"
            >
              <div className="w-9 h-9 rounded-xl bg-neutral-700/60 flex items-center justify-center shrink-0">
                <Settings2 className="w-5 h-5 text-neutral-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">
                  Configuración
                </p>
                <p className="text-xs text-neutral-500">
                  Datos, contacto y perfil público
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
            </Link>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ALUMNOS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "students" && (
        <div className="space-y-5">
          {/* ── Toolbar ─────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Active / Inactive toggle */}
            <div className="flex items-center gap-1 bg-neutral-800 border border-neutral-700 rounded-lg p-1">
              <Link
                href={tabUrl("students")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  !showInactive
                    ? "bg-neutral-700 text-neutral-100"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Activos
                <span
                  className={`ml-1.5 tabular-nums ${!showInactive ? "text-neutral-300" : "text-neutral-600"}`}
                >
                  ({activeCount})
                </span>
              </Link>
              <Link
                href={tabUrl("students", { inactive: "1" })}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  showInactive
                    ? "bg-neutral-700 text-neutral-100"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Inactivos
                <span
                  className={`tabular-nums ${showInactive ? "text-neutral-300" : "text-neutral-600"}`}
                >
                  ({inactiveCount})
                </span>
                {pendingCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </Link>
            </div>

            {academy.isActive && (
              <RegisterStudentSection academyId={academyId} />
            )}
          </div>

          {/* ── Search ──────────────────────────────────────────────────── */}
          <form
            method="GET"
            action={`/instructor/academies/${academyId}`}
            className="flex gap-2"
          >
            <input type="hidden" name="tab" value="students" />
            {showInactive && <input type="hidden" name="inactive" value="1" />}
            <div className="relative flex-1 max-w-sm">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="search"
                name="q"
                defaultValue={searchQuery}
                placeholder="Buscar por nombre..."
                className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm text-neutral-200 transition-colors"
            >
              Buscar
            </button>
            {searchQuery && (
              <Link
                href={tabUrl("students", showInactive ? { inactive: "1" } : {})}
                className="px-4 py-2 bg-transparent border border-neutral-700 rounded-lg text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Limpiar
              </Link>
            )}
          </form>

          {/* ── Members table ───────────────────────────────────────────── */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-800">
              <p className="text-xs text-neutral-500">
                {totalMemberCount.toLocaleString("es-CL")} registro
                {totalMemberCount !== 1 ? "s" : ""}
                {searchQuery && ` · "${searchQuery}"`}
              </p>
            </div>

            {members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
                  <Users className="w-6 h-6 text-neutral-600" />
                </div>
                <p className="text-neutral-500 text-sm">
                  {searchQuery
                    ? `No se encontraron alumnos con "${searchQuery}".`
                    : showInactive
                      ? "No hay alumnos inactivos en esta academia."
                      : "Aún no hay alumnos registrados en esta academia."}
                </p>
                {!searchQuery && !showInactive && academy.isActive && (
                  <RegisterStudentSection academyId={academyId} />
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/80">
                      <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider hidden sm:table-cell">
                        RUT
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Grado
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                        Estado
                      </th>
                      <th className="px-5 py-3 w-28" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {members.map((p) => (
                      <tr
                        key={p.id}
                        className={`transition-colors group ${
                          p.is_active
                            ? "hover:bg-neutral-800/40"
                            : "bg-neutral-900/60 hover:bg-neutral-800/30 opacity-75"
                        }`}
                      >
                        <td className="px-5 py-3 text-neutral-100 font-medium">
                          {p.full_name}
                        </td>
                        <td className="px-5 py-3 text-neutral-400 tabular-nums text-xs hidden sm:table-cell">
                          {p.rut}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${GRADE_STYLES[p.grade as Grade]}`}
                          >
                            {GRADE_LABELS[p.grade as Grade]}
                            {p.dan ? ` ${p.dan}° Dan` : ""}
                          </span>
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell">
                          {p.is_active ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Activo
                            </span>
                          ) : p.auth_user_id === null ? (
                            <span className="inline-flex items-center gap-1 bg-amber-900/40 text-amber-400 border border-amber-700/60 px-2 py-0.5 rounded-full text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                              Pendiente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-neutral-800 text-neutral-400 border border-neutral-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/instructor/students/${p.id}?from=${academyId}`}
                              title="Ver ficha completa"
                              className="p-1.5 rounded-lg text-primary-400 hover:text-primary-300 hover:bg-neutral-800 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="sr-only">Ver ficha</span>
                            </Link>
                            <Link
                              href={`/instructor/grade-exams/new?practitionerId=${p.id}`}
                              title="Iniciar examen de grado"
                              className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-neutral-800 transition-colors"
                            >
                              <GraduationCap className="w-4 h-4" />
                              <span className="sr-only">Iniciar examen</span>
                            </Link>
                            <EditStudentModal
                              student={{
                                id: p.id,
                                fullName: p.full_name,
                                weightKg: p.weight_kg,
                                heightCm: p.height_cm,
                                contactPhone: p.contact_phone,
                                contactEmail: p.contact_email,
                                addressStreet: p.address_street,
                                addressCity: p.address_city,
                                addressRegion: p.address_region,
                              }}
                            />
                            {academy.isActive && (
                              <RemoveMemberButton
                                academyId={academyId}
                                practitionerId={p.id}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Pagination ──────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500">
                Página {page} de {totalPages} ·{" "}
                {totalMemberCount.toLocaleString("es-CL")} registros
              </p>
              <div className="flex items-center gap-1">
                {page > 1 && (
                  <Link
                    href={pageUrl(page - 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                  </Link>
                )}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p2 = start + i;
                  return (
                    <Link
                      key={p2}
                      href={pageUrl(p2)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                        p2 === page
                          ? "bg-primary-600 border-primary-600 text-white"
                          : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300"
                      }`}
                    >
                      {p2}
                    </Link>
                  );
                })}
                {page < totalPages && (
                  <Link
                    href={pageUrl(page + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
                  >
                    Siguiente <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: CONFIGURACIÓN
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-neutral-700/60 flex items-center justify-center">
                <Settings2 className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-neutral-100">
                  Configuración de la academia
                </h2>
                <p className="text-xs text-neutral-500">
                  Datos básicos, perfil público e información de contacto
                </p>
              </div>
            </div>
            <EditAcademyForm
              academyId={academyId}
              name={academy.name}
              city={academy.city}
              address={academy.address}
              foundedDate={academy.foundedDate}
              description={academy.description ?? null}
              founderStory={academy.founderStory ?? null}
              contactPhone={academy.contactPhone ?? null}
              contactEmail={academy.contactEmail ?? null}
              contactInstagram={academy.contactInstagram ?? null}
              contactWhatsapp={academy.contactWhatsapp ?? null}
              contactWebsite={academy.contactWebsite ?? null}
            />
          </div>
        </div>
      )}
    </main>
  );
}
