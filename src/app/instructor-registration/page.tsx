// Server Component — no "use client"
// Validates: Requisito 1.1

import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  BookOpen,
  Users,
  CheckCircle,
  Trophy,
  Swords,
} from "lucide-react";
import { InstructorRequestForm } from "@/modules/instructor-account-requests/presentation/components/InstructorRequestForm";

export const metadata = {
  title: "Registro de Instructores — Kombat Taekwondo Chile",
  description:
    "Solicita la creación de tu cuenta como instructor oficial de Kombat Taekwondo Chile.",
};

const BENEFICIOS = [
  {
    icon: GraduationCap,
    titulo: "Cuenta oficial de instructor",
    desc: "Accede a herramientas exclusivas para gestionar tus alumnos y su progreso.",
  },
  {
    icon: BookOpen,
    titulo: "Registro de exámenes de grado",
    desc: "Crea y administra exámenes de grado para tus practicantes desde tu panel.",
  },
  {
    icon: Users,
    titulo: "Gestión de alumnos",
    desc: "Visualiza el historial marcial y estado de cada practicante bajo tu tutela.",
  },
  {
    icon: Trophy,
    titulo: "Participación en eventos",
    desc: "Inscribe a tus alumnos en torneos y eventos de Kombat Taekwondo Chile.",
  },
];

export default function InstructorRegistrationPage() {
  return (
    <main className="min-h-screen bg-neutral-950 flex">
      {/* ── Panel izquierdo — formulario ── */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-8 sm:px-16 lg:px-20 xl:px-28 py-12">
        {/* Brand mark */}
        <div className="mb-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/10 shadow-sm shadow-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/KombatLogoSquare.webp"
                alt="Kombat Taekwondo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-neutral-200 font-semibold text-sm tracking-wide">
              Kombat Taekwondo
            </span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Ir al inicio
          </Link>
        </div>

        {/* Encabezado */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-600/10 border border-amber-500/20 text-amber-400 text-xs font-medium px-3 py-1 rounded-full mb-4">
            <GraduationCap className="w-3 h-3" />
            Instructores Oficiales
          </div>
          <h1 className="text-3xl font-bold text-neutral-50 leading-tight mb-2">
            Solicita tu cuenta de instructor
          </h1>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Completa el formulario para unirte al cuerpo de instructores
            oficiales. Revisaremos tu solicitud y recibirás un email con los
            pasos para establecer tu contraseña. Una vez inscrito, podrás
            registrar tus academias y gestionar a tus alumnos desde tu panel.
          </p>
        </div>

        {/* Formulario */}
        <InstructorRequestForm />

        {/* Footer */}
        <p className="mt-6 text-xs text-neutral-600 text-center">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Inicia sesión
          </Link>
        </p>
      </div>

      {/* ── Panel derecho — visual ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-neutral-900 border-l border-neutral-800 overflow-hidden">
        {/* Radial glow */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(217,119,6,0.4) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
          aria-hidden="true"
        />

        {/* Contenido */}
        <div className="relative z-10 flex flex-col justify-center w-full px-12 py-12">
          {/* Ilustración artes marciales */}
          <div className="flex justify-center mb-6">
            <div className="relative flex items-center justify-center">
              {/* Anillos decorativos */}
              <div className="absolute w-52 h-52 rounded-full border border-amber-500/10" />
              <div className="absolute w-40 h-40 rounded-full border border-amber-500/10" />
              <div className="absolute w-28 h-28 rounded-full border border-amber-500/15" />

              {/* Glow difuso */}
              <div
                className="absolute w-36 h-36 rounded-full blur-3xl"
                style={{ background: "rgba(245,158,11,0.18)" }}
                aria-hidden="true"
              />

              {/* Ícono central */}
              <div className="relative w-28 h-28 rounded-3xl bg-amber-600/15 border border-amber-500/30 flex items-center justify-center shadow-2xl shadow-amber-950/40">
                <Swords
                  className="w-14 h-14 text-amber-400"
                  strokeWidth={1.5}
                />
              </div>

              {/* Badges */}
              <div className="absolute -top-3 -left-4 flex items-center gap-1.5 bg-neutral-800/90 border border-amber-500/30 text-amber-400 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
                <GraduationCap className="w-3 h-3" />
                Instructor
              </div>
              <div className="absolute -bottom-3 -right-4 flex items-center gap-1.5 bg-neutral-800/90 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
                <CheckCircle className="w-3 h-3" />
                Verificado
              </div>
            </div>
          </div>

          {/* Título */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-neutral-100 mb-2">
              Instructor Oficial
            </h2>
            <p className="text-neutral-400 text-sm leading-relaxed max-w-xs mx-auto">
              Lidera el desarrollo marcial de tus alumnos con herramientas
              diseñadas para instructores profesionales.
            </p>
          </div>

          {/* Beneficios */}
          <div className="space-y-3">
            {BENEFICIOS.map(({ icon: Icon, titulo, desc }) => (
              <div
                key={titulo}
                className="flex items-start gap-3 bg-neutral-800/40 border border-neutral-700/50 rounded-xl px-4 py-3"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-600/15 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-200">
                    {titulo}
                  </p>
                  <p className="text-xs text-neutral-500 leading-relaxed mt-0.5">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
