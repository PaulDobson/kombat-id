import { requireUser } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

export const metadata = {
  title: "Nueva contraseña — Kombat Taekwondo",
};

export default async function UpdatePasswordPage() {
  // The user arrives here after clicking the reset link in their email.
  // Supabase exchanges the token in /auth/callback and sets a session,
  // so requireUser() will succeed at this point.
  await requireUser();

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl shadow-neutral-950/80">
          {/* Accent bar */}
          <div className="h-1 w-full bg-linear-to-r from-primary-600 via-indigo-500 to-primary-600" />

          <div className="px-8 py-8 space-y-6">
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
                Establece tu nueva contraseña
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Elige una contraseña segura de al menos 8 caracteres.
              </p>
            </div>

            <UpdatePasswordForm />
          </div>
        </div>

        <p className="text-center text-xs text-neutral-600 mt-6">
          Kombat Taekwondo Chile
        </p>
      </div>
    </div>
  );
}
