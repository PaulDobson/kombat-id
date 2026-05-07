/**
 * Setup script — Referee Portal Images Storage Bucket
 *
 * Creates the `referee-portal-images` bucket in Supabase Storage and applies
 * the necessary RLS policies so that:
 *   - Only admins can upload, update, and delete images
 *   - Authenticated users (referees and admins) can read images
 *
 * Usage:
 *   pnpm setup:referee-portal-storage
 *
 * Requirements:
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - Migration 034_referee_portal_publications_enhanced.sql applied
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌  Missing env vars in .env.local");
  console.error(
    "    Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET_NAME = "referee-portal-images";

async function main() {
  console.log("🪣  Setting up referee-portal-images storage bucket...\n");

  // ── 1. Check if bucket already exists ────────────────────────────────────
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    console.error("❌  Failed to list buckets:", listError.message);
    process.exit(1);
  }

  const exists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (exists) {
    console.log(
      `ℹ️   Bucket "${BUCKET_NAME}" already exists — skipping creation.`,
    );
  } else {
    // ── 2. Create the bucket ────────────────────────────────────────────────
    // public: true so images can be served directly via the public URL
    // without generating signed URLs on every request.
    // Write access is restricted to admins via RLS policies below.
    const { error: createError } = await supabase.storage.createBucket(
      BUCKET_NAME,
      {
        public: true,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
        fileSizeLimit: 5242880, // 5 MB
      },
    );

    if (createError) {
      console.error("❌  Failed to create bucket:", createError.message);
      process.exit(1);
    }

    console.log(`✅  Bucket "${BUCKET_NAME}" created successfully.`);
    console.log("    - public: true (images served via public URL)");
    console.log("    - allowedMimeTypes: jpeg, png, webp");
    console.log("    - fileSizeLimit: 5 MB");
  }

  // ── 3. Apply storage RLS policies via SQL ─────────────────────────────────
  console.log("\n🔒  Applying storage RLS policies...");

  const policies = [
    {
      name: "admin_upload_referee_portal_images",
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'storage'
              AND tablename = 'objects'
              AND policyname = 'admin_upload_referee_portal_images'
          ) THEN
            CREATE POLICY "admin_upload_referee_portal_images"
              ON storage.objects FOR INSERT
              TO authenticated
              WITH CHECK (
                bucket_id = 'referee-portal-images'
                AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
              );
          END IF;
        END $$;
      `,
    },
    {
      name: "admin_update_referee_portal_images",
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'storage'
              AND tablename = 'objects'
              AND policyname = 'admin_update_referee_portal_images'
          ) THEN
            CREATE POLICY "admin_update_referee_portal_images"
              ON storage.objects FOR UPDATE
              TO authenticated
              USING (
                bucket_id = 'referee-portal-images'
                AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
              );
          END IF;
        END $$;
      `,
    },
    {
      name: "admin_delete_referee_portal_images",
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'storage'
              AND tablename = 'objects'
              AND policyname = 'admin_delete_referee_portal_images'
          ) THEN
            CREATE POLICY "admin_delete_referee_portal_images"
              ON storage.objects FOR DELETE
              TO authenticated
              USING (
                bucket_id = 'referee-portal-images'
                AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
              );
          END IF;
        END $$;
      `,
    },
    {
      name: "authenticated_read_referee_portal_images",
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'storage'
              AND tablename = 'objects'
              AND policyname = 'authenticated_read_referee_portal_images'
          ) THEN
            CREATE POLICY "authenticated_read_referee_portal_images"
              ON storage.objects FOR SELECT
              TO authenticated
              USING (bucket_id = 'referee-portal-images');
          END IF;
        END $$;
      `,
    },
  ];

  let policiesApplied = 0;
  let policiesSkipped = 0;

  for (const policy of policies) {
    const { error } = await supabase.rpc(
      "exec_sql" as never,
      { sql: policy.sql } as never,
    );

    if (error) {
      console.warn(
        `   ⚠️  Could not apply policy "${policy.name}" via RPC: ${error.message}`,
      );
      policiesSkipped++;
    } else {
      console.log(`   ✓ Policy "${policy.name}" applied`);
      policiesApplied++;
    }
  }

  if (policiesSkipped > 0) {
    console.log(
      `\n⚠️   ${policiesSkipped} policies could not be applied automatically.`,
    );
    console.log("    Apply them manually in the Supabase SQL editor:");
    console.log("\n    -- Allow admins to upload images");
    console.log(`    CREATE POLICY "admin_upload_referee_portal_images"`);
    console.log(`      ON storage.objects FOR INSERT TO authenticated`);
    console.log(`      WITH CHECK (`);
    console.log(`        bucket_id = 'referee-portal-images'`);
    console.log(
      `        AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())`,
    );
    console.log(`      );`);
    console.log("\n    -- Allow admins to update images");
    console.log(`    CREATE POLICY "admin_update_referee_portal_images"`);
    console.log(`      ON storage.objects FOR UPDATE TO authenticated`);
    console.log(`      USING (`);
    console.log(`        bucket_id = 'referee-portal-images'`);
    console.log(
      `        AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())`,
    );
    console.log(`      );`);
    console.log("\n    -- Allow admins to delete images");
    console.log(`    CREATE POLICY "admin_delete_referee_portal_images"`);
    console.log(`      ON storage.objects FOR DELETE TO authenticated`);
    console.log(`      USING (`);
    console.log(`        bucket_id = 'referee-portal-images'`);
    console.log(
      `        AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())`,
    );
    console.log(`      );`);
    console.log("\n    -- Allow authenticated users to read images");
    console.log(`    CREATE POLICY "authenticated_read_referee_portal_images"`);
    console.log(`      ON storage.objects FOR SELECT TO authenticated`);
    console.log(`      USING (bucket_id = 'referee-portal-images');`);
  } else {
    console.log(`\n✅  ${policiesApplied} storage policies applied.`);
  }

  console.log("\n✅  Referee portal storage setup complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Bucket: ${BUCKET_NAME}`);
  console.log("  Path convention:");
  console.log("    Cover images: {publicationId}/cover.{jpg|png|webp}");
  console.log("  Public URL pattern:");
  console.log(
    `    ${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/{path}`,
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err) => {
  console.error("\n❌  Setup failed:", err.message);
  process.exit(1);
});
