/**
 * Grants admin access to a user by email.
 *
 * Usage:
 *   pnpm tsx scripts/grant-admin.ts tu-email@ejemplo.com
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error("❌  Usage: pnpm tsx scripts/grant-admin.ts <email>");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // 1. Find the user by email
  const { data: authList, error: listError } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error("❌  Failed to list users:", listError.message);
    process.exit(1);
  }

  const user = authList.users.find(
    (u) => u.email?.toLowerCase() === email!.toLowerCase(),
  );

  if (!user) {
    console.error(`❌  No auth user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`✅  Found user: ${user.email} (${user.id})`);

  // 2. Insert into admin_users
  const { error: insertError } = await supabase
    .from("admin_users")
    .insert({ user_id: user.id })
    .select();

  if (insertError) {
    if (insertError.code === "23505") {
      console.log(`ℹ️   User ${email} is already an admin.`);
    } else {
      console.error(
        "❌  Failed to insert into admin_users:",
        insertError.message,
      );
      process.exit(1);
    }
  } else {
    console.log(`🔑  Admin access granted to ${email}`);
  }

  // 3. Verify
  const { data: check } = await supabase
    .from("admin_users")
    .select("user_id, granted_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (check) {
    console.log(
      `✅  Confirmed in admin_users — granted_at: ${check.granted_at}`,
    );
  }
}

main();
