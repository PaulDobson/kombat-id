import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
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
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-600 mb-2">
            <span className="text-white font-bold text-lg" aria-hidden="true">
              KT
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Recuperar contraseña
          </h1>
          <p className="text-sm text-neutral-400">
            Te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        {/* Card */}
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
          <ResetPasswordForm />
        </div>

        <p className="text-center text-xs text-neutral-600">
          <Link
            href="/login"
            className="text-primary-400 hover:text-primary-300 transition-colors"
          >
            ← Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
