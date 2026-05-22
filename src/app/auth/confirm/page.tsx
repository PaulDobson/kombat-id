"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Handles the implicit auth flow used by Supabase inviteUserByEmail.
 *
 * When PKCE is not available (invite flow), Supabase redirects to the Site URL
 * with the session tokens in the URL hash fragment:
 *   http://localhost:3000/#access_token=...&type=invite
 *
 * Since hash fragments are never sent to the server, this client-side page
 * reads the hash, calls setSession to establish the session, then redirects
 * to the appropriate page based on the token type and user metadata.
 */
export default function AuthConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    async function handleHashSession() {
      const hash = window.location.hash.substring(1); // remove leading #
      if (!hash) {
        router.replace("/login");
        return;
      }

      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type"); // "invite", "recovery", "signup", etc.
      const error = params.get("error");
      const errorDescription = params.get("error_description");

      if (error) {
        setErrorMessage(errorDescription ?? error);
        setStatus("error");
        return;
      }

      if (!accessToken || !refreshToken) {
        router.replace("/login");
        return;
      }

      const supabase = createClient();
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError || !data.user) {
        setErrorMessage(
          sessionError?.message ?? "No se pudo establecer la sesión",
        );
        setStatus("error");
        return;
      }

      const user = data.user;

      // Invited students must set their own password
      if (
        type === "invite" ||
        user.user_metadata?.must_change_password === true
      ) {
        router.replace("/change-password");
        return;
      }

      // Password recovery
      if (type === "recovery") {
        router.replace("/update-password");
        return;
      }

      // Default: go to dashboard based on role
      const role = user.app_metadata?.role as string | undefined;
      const home =
        role === "referee"
          ? "/referee/dashboard"
          : role === "instructor" || role === "profesor" || role === "maestro"
            ? "/instructor"
            : "/dashboard";

      router.replace(home);
    }

    handleHashSession();
  }, [router]);

  if (status === "error") {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="h-1 w-full bg-red-600" />
          <div className="px-8 py-8 space-y-4">
            <h1 className="text-xl font-bold text-neutral-100">
              Error al activar la cuenta
            </h1>
            <p className="text-sm text-neutral-400">{errorMessage}</p>
            <a
              href="/login"
              className="inline-block w-full text-center bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              Ir al inicio de sesión
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="h-1 w-full bg-[#C9A84C]" />
        <div className="px-8 py-8 space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center mx-auto">
            <svg
              className="w-5 h-5 text-[#C9A84C] animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
          <p className="text-sm text-neutral-400">Activando tu cuenta...</p>
          <p className="text-xs text-neutral-600">Kombat Taekwondo Chile</p>
        </div>
      </div>
    </div>
  );
}
