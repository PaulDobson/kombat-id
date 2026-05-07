// Server Component — no "use client"
// Validates: Propiedad 9 — Solo árbitros aprobados acceden al portal
// Validates: Requisitos 7.2, 7.3, 14.1, 14.2, 14.3, 14.4

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { signOutAction } from "@/app/auth/actions";

async function requireRefereeUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Read the role from the authoritative source (admin API) instead of the
  // JWT, which may be stale if app_metadata was updated after the last login.
  const { data: authUser, error } = await adminSupabase.auth.admin.getUserById(
    user.id,
  );

  if (error || !authUser?.user) {
    redirect("/login");
  }

  const role = authUser.user.app_metadata?.role as string | undefined;
  if (role !== "referee") {
    redirect("/dashboard");
  }

  return user;
}

export default async function RefereeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRefereeUser();

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link
            href="/referee/dashboard"
            className="flex items-center gap-2.5 shrink-0"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/KombatLogoSquare.webp"
                alt="Kombat Taekwondo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-sm font-semibold text-neutral-200 shrink-0">
              Portal de Árbitros — Kombat Taekwondo Chile
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/referee/dashboard"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
            >
              Publicaciones
            </Link>
            <Link
              href="/referee/profile"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
            >
              Mi perfil
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                Cerrar sesión
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
