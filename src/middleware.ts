import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const AUTH_ROUTES = ["/login", "/register", "/reset-password"];
const PUBLIC_ROUTES = [
  ...AUTH_ROUTES,
  "/auth/callback",
  "/verify",
  "/academies",
  "/events",
  "/design",
  "/referee-registration",
  "/instructor-registration",
  "/referees",
  "/reset-password",
  "/update-password",
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
    const role = user.app_metadata?.role as string | undefined;
    const home =
      role === "referee"
        ? "/referee/dashboard"
        : role === "instructor"
          ? "/instructor"
          : "/dashboard";
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Redirect unauthenticated users away from protected routes
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // First-login guard: force password change before accessing anything else
  if (
    user.user_metadata?.must_change_password === true &&
    pathname !== "/change-password"
  ) {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  // Redirect referee users away from the practitioner dashboard
  const role = user.app_metadata?.role as string | undefined;
  if (role === "referee" && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/referee/dashboard", request.url));
  }

  // Redirect non-referee users away from the referee portal
  if (role !== "referee" && pathname.startsWith("/referee")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
