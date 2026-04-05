import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  // Redirect already-authenticated users
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-600 mb-2">
            <span className="text-white font-bold text-lg" aria-hidden="true">
              KT
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Kombat Taekwondo
          </h1>
          <p className="text-sm text-neutral-400">
            Ingresa a tu cuenta para continuar
          </p>
        </div>

        {/* Card */}
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 space-y-6">
          <LoginForm />

          <div className="text-center">
            <Link
              href="/reset-password"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-600">
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="text-primary-400 hover:text-primary-300 transition-colors"
          >
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
