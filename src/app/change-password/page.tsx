import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata = {
  title: "Cambiar contraseña — Kombat Taekwondo",
};

export default async function ChangePasswordPage() {
  const user = await requireUser();

  // If the flag is not set, this page is not needed — send to home
  if (user.user_metadata?.must_change_password !== true) {
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
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl shadow-neutral-950/80">
          {/* Accent bar */}
          <div className="h-1 w-full bg-linear-to-r from-primary-600 via-indigo-500 to-primary-600" />

          <div className="px-8 py-8 space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <div className="w-11 h-11 rounded-xl bg-primary-900/50 border border-primary-700/40 flex items-center justify-center mb-4">
                <svg
                  className="w-5 h-5 text-primary-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-neutral-100 tracking-tight">
                Establece tu contraseña
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Tu cuenta fue creada con una contraseña temporal. Debes
                establecer una contraseña personal antes de continuar.
              </p>
            </div>

            {/* Requirements hint */}
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Requisitos
              </p>
              <ul className="space-y-1">
                {[
                  "Mínimo 8 caracteres",
                  "Usa una contraseña que no hayas usado antes",
                ].map((req) => (
                  <li
                    key={req}
                    className="flex items-center gap-2 text-xs text-neutral-500"
                  >
                    <span
                      className="w-1 h-1 rounded-full bg-primary-500 shrink-0"
                      aria-hidden="true"
                    />
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            <ChangePasswordForm />
          </div>
        </div>

        {/* Branding */}
        <p className="text-center text-xs text-neutral-600 mt-6">
          Kombat Taekwondo Chile
        </p>
      </div>
    </div>
  );
}
