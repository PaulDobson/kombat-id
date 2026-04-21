import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

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
            Crea tu identidad
          </h1>
          <p className="text-neutral-400 text-sm">
            Regístrate y forma parte del registro oficial.
          </p>
        </div>

        {/* Form */}
        <RegisterForm />

        {/* Footer link */}
        <div className="mt-6 text-center">
          <p className="text-xs text-neutral-500">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="text-primary-400 hover:text-primary-300 transition-colors"
            >
              Inicia sesión
            </Link>
          </p>
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

          {/* Steps preview */}
          <div className="w-full max-w-sm space-y-3 mb-8 text-left">
            {[
              {
                step: "01",
                title: "Crea tu cuenta",
                desc: "Regístrate con tu correo electrónico.",
              },
              {
                step: "02",
                title: "Completa tu perfil",
                desc: "Tu administrador registrará tus datos marciales.",
              },
              {
                step: "03",
                title: "Obtén tu QR",
                desc: "Verifica tu identidad en cualquier evento oficial.",
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className="flex items-start gap-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-3.5"
              >
                <span className="shrink-0 w-7 h-7 rounded-lg bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400 text-xs font-bold">
                  {step}
                </span>
                <div>
                  <p className="text-neutral-100 text-sm font-medium">
                    {title}
                  </p>
                  <p className="text-neutral-500 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
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
