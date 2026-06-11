import type { Database } from "@/types/database.types";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

import { createServerClient } from "@supabase/ssr";

export async function updateSession(
  request: NextRequest,
  response: NextResponse,
) {
  const supabase = createServerClient<Database>(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // When the refresh token is invalid or expired, Supabase cannot renew the
  // session. Clear all auth cookies so the browser doesn't get stuck in a
  // redirect loop between the middleware and /login.
  if (
    error &&
    (error.message?.includes("Refresh Token Not Found") ||
      error.message?.includes("Invalid Refresh Token") ||
      error.status === 400 ||
      error.status === 401)
  ) {
    const clearResponse = NextResponse.redirect(new URL("/login", request.url));

    // Delete all sb-* cookies (Supabase auth cookies)
    for (const cookie of request.cookies.getAll()) {
      if (
        cookie.name.startsWith("sb-") ||
        cookie.name.includes("supabase") ||
        cookie.name.includes("auth-token")
      ) {
        clearResponse.cookies.delete(cookie.name);
      }
    }

    return { supabase, user: null, response: clearResponse };
  }

  return { supabase, user, response };
}
