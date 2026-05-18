import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const role = user.app_metadata?.role as string | undefined;
    const home =
      role === "referee"
        ? "/referee/dashboard"
        : role === "instructor"
          ? "/instructor"
          : "/dashboard";
    redirect(home);
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* ── Left panel — form ── */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-8 sm:px-16 lg:px-20 xl:px-28 py-12">
        {/* Brand mark */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-600">
              <span className="text-white font-bold text-sm" aria-hidden="true">
                KT
              </span>
            </div>
            <span className="text-neutral-200 font-semibold text-sm tracking-wide">
              Kombat Taekwondo
            </span>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-50 leading-tight mb-1">
            Bienvenido de vuelta
          </h1>
          <p className="text-neutral-400 text-sm">
            Tu identidad marcial digital te espera.
          </p>
        </div>

        {/* Form */}
        <LoginForm />

        {/* Footer links */}
        <div className="mt-6 flex items-center justify-between text-xs text-neutral-500">
          <Link
            href="/reset-password"
            className="hover:text-neutral-300 transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
          <Link
            href="/register"
            className="text-primary-400 hover:text-primary-300 transition-colors"
          >
            Crear cuenta
          </Link>
        </div>
      </div>

      {/* ── Right panel — brand showcase ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-neutral-900 border-l border-neutral-800 overflow-hidden">
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(79,70,229,0.35) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-center">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600">
              <span className="text-white font-bold" aria-hidden="true">
                KT
              </span>
            </div>
            <span className="text-neutral-100 font-semibold text-lg">
              Kombat Taekwondo
            </span>
          </div>

          {/* Mock identity card */}
          <div className="w-full max-w-sm bg-neutral-800/60 border border-neutral-700/60 rounded-2xl p-5 backdrop-blur-sm mb-6 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-600/30 border border-primary-500/40 flex items-center justify-center">
                <span className="text-primary-300 text-xs font-bold">ID</span>
              </div>
              <div>
                <p className="text-neutral-100 text-sm font-medium">
                  Identidad Digital
                </p>
                <p className="text-neutral-500 text-xs">
                  Practicante verificado
                </p>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center gap-1 text-xs text-success-400 bg-success-500/10 border border-success-500/20 rounded-full px-2 py-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-success-400"
                    aria-hidden="true"
                  />
                  Activo
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-900/60 rounded-xl p-3">
                <p className="text-neutral-500 text-xs mb-1">Grado</p>
                <p className="text-neutral-100 text-sm font-semibold">
                  Cinturón Negro
                </p>
                <p className="text-primary-400 text-xs">1er Dan</p>
              </div>
              <div className="bg-neutral-900/60 rounded-xl p-3">
                <p className="text-neutral-500 text-xs mb-1">Ranking</p>
                <p className="text-neutral-100 text-sm font-semibold">#3</p>
                <p className="text-neutral-400 text-xs">Categoría adulto</p>
              </div>
              <div className="bg-neutral-900/60 rounded-xl p-3">
                <p className="text-neutral-500 text-xs mb-1">Certificaciones</p>
                <p className="text-neutral-100 text-sm font-semibold">4</p>
                <p className="text-neutral-400 text-xs">Vigentes</p>
              </div>
              <div className="bg-neutral-900/60 rounded-xl p-3">
                <p className="text-neutral-500 text-xs mb-1">Historial</p>
                <p className="text-neutral-100 text-sm font-semibold">12</p>
                <p className="text-neutral-400 text-xs">Eventos</p>
              </div>
            </div>
          </div>

          <p className="text-neutral-500 text-xs max-w-xs leading-relaxed">
            La identidad oficial de cada practicante de Kombat Taekwondo en
            Chile. Verificable, permanente y tuya.
          </p>
        </div>
      </div>
    </div>
  );
}
