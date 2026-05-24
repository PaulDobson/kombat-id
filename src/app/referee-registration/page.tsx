// Server Component — no "use client"
// Validates: Requisitos 1.1, 1.3, 2.1

import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Award,
  Users,
  CheckCircle,
  Star,
} from "lucide-react";
import { RefereeRegistrationForm } from "@/modules/referee-registration/presentation/components/RefereeRegistrationForm";

export const metadata = {
  title: "Registro de Árbitros — Kombat Taekwondo Chile",
  description:
    "Solicita tu acreditación como árbitro oficial de Kombat Taekwondo Chile.",
};

const BENEFICIOS = [
  {
    icon: Shield,
    titulo: "Acreditación oficial",
    desc: "Obtén tu credencial como árbitro reconocido por Kombat Taekwondo Chile.",
  },
  {
    icon: Award,
    titulo: "Perfil verificado",
    desc: "Aparece en el directorio público de árbitros oficiales con QR verificable.",
  },
  {
    icon: Users,
    titulo: "Red de árbitros",
    desc: "Conecta con la comunidad de árbitros y accede a convocatorias de eventos.",
  },
  {
    icon: Star,
    titulo: "Historial de eventos",
    desc: "Registra y comparte tu participación como árbitro en torneos y eventos.",
  },
];

export default function RefereeRegistrationPage() {
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
          <div className="inline-flex items-center gap-2 bg-primary-600/10 border border-primary-500/20 text-primary-400 text-xs font-medium px-3 py-1 rounded-full mb-4">
            <Shield className="w-3 h-3" />
            Árbitros Oficiales
          </div>
          <h1 className="text-3xl font-bold text-neutral-50 leading-tight mb-2">
            Solicita tu acreditación
          </h1>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Completa el formulario para unirte al cuerpo de árbitros oficiales.
            Revisaremos tu solicitud y recibirás un email con los próximos
            pasos.
          </p>
        </div>

        {/* Formulario */}
        <RefereeRegistrationForm />

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
              "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(79,70,229,0.45) 0%, transparent 70%)",
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
        <div className="relative z-10 flex flex-col justify-center w-full px-12 py-16">
          {/* Ícono central */}
          <div className="flex justify-center mb-10">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center shadow-2xl shadow-primary-950/50">
                <Shield
                  className="w-12 h-12 text-primary-400"
                  strokeWidth={1.5}
                />
              </div>
              {/* Anillos decorativos */}
              <div className="absolute -inset-3 rounded-3xl border border-primary-500/10" />
              <div className="absolute -inset-6 rounded-3xl border border-primary-500/5" />
              {/* Badges flotantes */}
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="absolute -bottom-2 -left-2 w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center shadow-lg">
                <Award className="w-4 h-4 text-amber-400" />
              </div>
            </div>
          </div>

          {/* Título */}
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-neutral-100 mb-2">
              Árbitro Oficial
            </h2>
            <p className="text-neutral-400 text-sm leading-relaxed max-w-xs mx-auto">
              Forma parte del cuerpo arbitral que garantiza la integridad de
              cada competencia.
            </p>
          </div>

          {/* Beneficios */}
          <div className="space-y-3">
            {BENEFICIOS.map(({ icon: Icon, titulo, desc }) => (
              <div
                key={titulo}
                className="flex items-start gap-3 bg-neutral-800/40 border border-neutral-700/50 rounded-xl px-4 py-3"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-600/15 border border-primary-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary-400" />
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
