import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const AUTH_ROUTES = ["/login", "/register", "/reset-password"];
const PUBLIC_ROUTES = [
  ...AUTH_ROUTES,
  "/auth/callback",
  "/verify",
  "/academies",
  "/design",
  "/",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas no necesitan sesión — saltar Supabase completamente
  if (
    PUBLIC_ROUTES.some(
      (r) => pathname === r || (r !== "/" && pathname.startsWith(r)),
    )
  ) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });
  const { user } = await updateSession(request, response);

  // Redirect authenticated users away from auth pages
  if (user && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users away from protected routes
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
