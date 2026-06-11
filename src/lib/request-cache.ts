/**
 * Request-scoped data cache using React.cache().
 *
 * React.cache() deduplicates calls within a single server render pass —
 * if multiple Server Components call the same cached function with the same
 * arguments in one request, only one database query is executed.
 *
 * This is the correct pattern for Next.js App Router instead of manually
 * threading data through props.
 *
 * IMPORTANT: React.cache() is per-request, not cross-request. It does NOT
 * replace unstable_cache (which is cross-request persistent caching).
 * Use React.cache() for identity/session data fetched multiple times per page.
 * Use unstable_cache() for shared read-heavy data like events, referees, etc.
 */
import "server-only";

import { cache } from "react";
import { adminSupabase } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Practitioner identity — fetched by DashboardNav AND by each page
// ---------------------------------------------------------------------------

/**
 * Returns the practitioner row for the given auth user id, deduped per request.
 * Queries only the columns needed by DashboardNav and auth guards.
 */
export const getPractitionerByAuthUserId = cache(
  async (
    authUserId: string,
  ): Promise<{
    id: string;
    full_name: string;
    role: string | null;
    is_active: boolean;
  } | null> => {
    const { data, error } = await adminSupabase
      .from("practitioners")
      .select("id, full_name, role, is_active")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error || !data) return null;
    return data as {
      id: string;
      full_name: string;
      role: string | null;
      is_active: boolean;
    };
  },
);

// ---------------------------------------------------------------------------
// Admin check — fetched by DashboardNav AND by admin page guards
// ---------------------------------------------------------------------------

/**
 * Returns true if the given auth user id belongs to an admin, deduped per request.
 */
export const getIsAdmin = cache(
  async (authUserId: string): Promise<boolean> => {
    const { data } = await adminSupabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", authUserId)
      .maybeSingle();
    return !!data;
  },
);

// ---------------------------------------------------------------------------
// Instructor academies — fetched by DashboardNav AND instructor pages
// ---------------------------------------------------------------------------

/**
 * Returns the active academy ids and names for a given instructor, deduped per request.
 * Used to build the nav dropdown and the instructor dashboard.
 */
export const getInstructorAcademyItems = cache(
  async (
    practitionerId: string,
  ): Promise<Array<{ id: string; name: string }>> => {
    const { data } = await adminSupabase
      .from("academies")
      .select("id, name")
      .contains("responsible_instructor_ids", [practitionerId])
      .eq("is_active", true)
      .order("name")
      .limit(10);

    return (data ?? []) as Array<{ id: string; name: string }>;
  },
);
