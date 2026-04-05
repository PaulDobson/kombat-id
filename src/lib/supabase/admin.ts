import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/config";
import type { Database } from "@/types/database.types";

export const adminSupabase = createClient<Database>(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
