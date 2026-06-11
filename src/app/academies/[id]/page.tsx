import { adminSupabase } from "@/lib/supabase/admin";
import { PublicNav } from "@/app/_components/PublicNav";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";
import { REGION_LABELS } from "@/lib/presentation-constants";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  MessageCircle,
  Shield,
  CheckCircle,
  ChevronLeft,
  CalendarDays,
  GraduationCap,
  Building2,
} from "lucide-react";

interface AcademyProfile {
  id: string;
  name: string;
  region: ChileanRegion;
  city: string;
  address: string | null;
  founded_date: string | null;
  responsible_instructor_ids: string[];
  description: string | null;
  founder_story: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_instagram: string | null;
  contact_whatsapp: string | null;
  contact_website: string | null;
  cover_image_path: string | null;
}

interface InstructorPublic {
  id: string;
  full_name: string;
  role: string | null;
  grade: string | null;
  dan: number | null;
}

const ROLE_LABELS: Record<string, string> = {
  instructor: "Instructor",
  profesor: "Profesor",
  maestro: "Maestro",
};

const ROLE_COLORS: Record<string, string> = {
  maestro: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  profesor: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  instructor: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
};

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

export default async function AcademyPublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: academyRow } = await adminSupabase
    .from("academies")
    .select(
      "id, name, region, city, address, founded_date, responsible_instructor_ids, " +
        "description, founder_story, contact_phone, contact_email, " +
        "contact_instagram, contact_whatsapp, contact_website, cover_image_path",
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!academyRow) notFound();
  const academy = academyRow as unknown as AcademyProfile;

  let coverUrl: string | null = null;
  if (academy.cover_image_path) {
    const { data } = adminSupabase.storage
      .from("academy-covers")
      .getPublicUrl(academy.cover_image_path);
    coverUrl = data?.publicUrl ?? null;
  }

  const instructors: InstructorPublic[] = [];
  if (academy.responsible_instructor_ids.length > 0) {
    const { data: rows } = await adminSupabase
      .from("practitioners")
      .select("id, full_name, role, grade, dan")
      .in("id", academy.responsible_instructor_ids)
      .eq("is_active", true);
    for (const r of rows ?? []) instructors.push(r as InstructorPublic);
  }

  const foundedYear = academy.founded_date
    ? new Date(academy.founded_date).getFullYear()
    : null;
  const regionLabel =
    REGION_LABELS[academy.region as ChileanRegion] ?? academy.region;
  const hasContact =
    academy.contact_phone ||
    academy.contact_email ||
    academy.contact_instagram ||
    academy.contact_whatsapp ||
    academy.contact_website;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <PublicNav />
      <main className="pt-16">
        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-neutral-800/60 min-h-[340px] flex items-end">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={academy.name}
              className="absolute inset-0 w-full h-full object-cover opacity-20"
            />
          ) : (
            <div
              className="absolute inset-0 bg-linear-to-br from-indigo-950/50 via-neutral-950 to-neutral-950"
              aria-hidden="true"
            />
          )}
          <div
            className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/80 to-transparent"
            aria-hidden="true"
          />
          <div className="relative max-w-5xl mx-auto px-6 pb-12 pt-20 w-full space-y-5">
            <Link
              href="/academies"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Directorio de academias
            </Link>
            <div className="inline-flex items-center gap-2 bg-emerald-900/40 border border-emerald-700/50 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" />
              Academia certificada · Federación Nacional
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              {academy.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-neutral-600" />
                {academy.city}, {regionLabel}
              </span>
              {foundedYear && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-neutral-600" />
                  Fundada en {foundedYear}
                </span>
              )}
              {instructors.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-neutral-600" />
                  {instructors.length} instructor
                  {instructors.length !== 1 ? "es" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 bg-neutral-900/70 border border-neutral-700/60 rounded-xl px-4 py-3 w-fit backdrop-blur-sm">
              <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs text-neutral-300">
                Registrada en Kombat ID · Instructores con certificación
                verificable
              </span>
            </div>
          </div>
        </section>

        {/* ── BODY ─────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-6 py-12 sm:py-16 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT: description + history */}
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              {academy.description && (
                <section className="space-y-3">
                  <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                    Sobre la academia
                  </h2>
                  <p className="text-neutral-300 leading-relaxed text-base whitespace-pre-line">
                    {academy.description}
                  </p>
                </section>
              )}

              {/* Founder story */}
              {academy.founder_story && (
                <section className="space-y-3">
                  <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                    Historia del fundador
                  </h2>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
                    <div
                      className="absolute top-4 left-4 text-6xl text-indigo-900/60 font-serif leading-none select-none"
                      aria-hidden="true"
                    >
                      &ldquo;
                    </div>
                    <p className="text-neutral-300 leading-relaxed text-base whitespace-pre-line relative z-10 pl-4">
                      {academy.founder_story}
                    </p>
                  </div>
                </section>
              )}

              {/* Empty state for description */}
              {!academy.description && !academy.founder_story && (
                <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center space-y-2">
                  <Building2 className="w-8 h-8 text-neutral-700 mx-auto" />
                  <p className="text-neutral-500 text-sm">
                    Esta academia aún no ha completado su perfil público.
                  </p>
                  <p className="text-neutral-600 text-xs">
                    Contacta directamente a través de los medios indicados.
                  </p>
                </section>
              )}

              {/* Instructors */}
              {instructors.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                    Equipo de instructores
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {instructors.map((instructor) => {
                      const roleLabel =
                        ROLE_LABELS[instructor.role ?? ""] ?? "Instructor";
                      const roleColor =
                        ROLE_COLORS[instructor.role ?? ""] ??
                        ROLE_COLORS.instructor;
                      const gradeLabel = instructor.grade
                        ? (GRADE_LABELS[instructor.grade] ?? instructor.grade)
                        : null;
                      return (
                        <div
                          key={instructor.id}
                          className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-start gap-4"
                        >
                          <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                            <span className="text-lg font-black text-indigo-400">
                              {instructor.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-neutral-100 leading-snug">
                              {instructor.full_name}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleColor}`}
                              >
                                {roleLabel}
                              </span>
                              {gradeLabel && (
                                <span className="text-xs text-neutral-500">
                                  Cinturón {gradeLabel}
                                  {instructor.dan
                                    ? ` ${instructor.dan}° Dan`
                                    : ""}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400">
                              <CheckCircle className="w-3 h-3" />
                              Certificación verificable
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* RIGHT: sidebar */}
            <div className="space-y-5">
              {/* Location */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                  Ubicación
                </h3>
                <div className="space-y-2">
                  <p className="flex items-start gap-2 text-sm text-neutral-300">
                    <MapPin className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
                    <span>
                      <span className="block font-medium">{academy.city}</span>
                      <span className="text-neutral-500">{regionLabel}</span>
                    </span>
                  </p>
                  {academy.address && (
                    <p className="text-xs text-neutral-500 pl-6">
                      {academy.address}
                    </p>
                  )}
                  {foundedYear && (
                    <p className="flex items-center gap-2 text-xs text-neutral-500 pt-2 border-t border-neutral-800">
                      <CalendarDays className="w-3.5 h-3.5 text-neutral-700" />
                      Fundada en {foundedYear}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact */}
              {hasContact && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                    Contacto
                  </h3>
                  <ul className="space-y-3">
                    {academy.contact_phone && (
                      <li>
                        <a
                          href={`tel:${academy.contact_phone}`}
                          className="flex items-center gap-3 text-sm text-neutral-300 hover:text-white transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                          {academy.contact_phone}
                        </a>
                      </li>
                    )}
                    {academy.contact_email && (
                      <li>
                        <a
                          href={`mailto:${academy.contact_email}`}
                          className="flex items-center gap-3 text-sm text-neutral-300 hover:text-white transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                            <Mail className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                          <span className="truncate">
                            {academy.contact_email}
                          </span>
                        </a>
                      </li>
                    )}
                    {academy.contact_whatsapp && (
                      <li>
                        <a
                          href={`https://wa.me/${academy.contact_whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-sm text-neutral-300 hover:text-white transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                          WhatsApp
                        </a>
                      </li>
                    )}
                    {academy.contact_instagram && (
                      <li>
                        <a
                          href={`https://instagram.com/${academy.contact_instagram.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-sm text-neutral-300 hover:text-white transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0 group-hover:bg-pink-500/20 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5 text-pink-400" />
                          </div>
                          @{academy.contact_instagram.replace("@", "")}
                        </a>
                      </li>
                    )}
                    {academy.contact_website && (
                      <li>
                        <a
                          href={
                            academy.contact_website.startsWith("http")
                              ? academy.contact_website
                              : `https://${academy.contact_website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-sm text-neutral-300 hover:text-white transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                            <Globe className="w-3.5 h-3.5 text-indigo-400" />
                          </div>
                          <span className="truncate">
                            {academy.contact_website.replace(
                              /^https?:\/\//,
                              "",
                            )}
                          </span>
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Back link */}
              <Link
                href="/academies"
                className="flex items-center justify-center gap-2 w-full py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Ver todas las academias
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-800 px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded bg-primary-600 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-white font-bold text-[9px]">KT</span>
            </div>
            <span>Kombat Taekwondo Chile</span>
          </div>
          <p>
            Academia certificada en el registro nacional ·{" "}
            {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
