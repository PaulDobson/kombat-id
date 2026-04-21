/**
 * Setup script — Event Storage Bucket
 *
 * Creates the `event-files` bucket in Supabase Storage and applies
 * the necessary RLS policies for admin uploads and public reads.
 *
 * Usage:
 *   pnpm setup:storage
 *
 * Requirements:
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - Migration 031_event_storage.sql applied (for the storage policies)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌  Missing env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET_NAME = "event-files";

async function main() {
  console.log("🪣  Setting up event-files storage bucket...\n");

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
    const { error: createError } = await supabase.storage.createBucket(
      BUCKET_NAME,
      {
        public: false,
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        fileSizeLimit: 10485760, // 10 MB
      },
    );

    if (createError) {
      console.error("❌  Failed to create bucket:", createError.message);
      process.exit(1);
    }

    console.log(`✅  Bucket "${BUCKET_NAME}" created successfully.`);
    console.log("    - public: false");
    console.log("    - allowedMimeTypes: jpeg, png, webp, pdf, doc, docx");
    console.log("    - fileSizeLimit: 10 MB");
  }

  // ── 3. Apply storage RLS policies via SQL ─────────────────────────────────
  console.log("\n🔒  Applying storage RLS policies...");

  // The policies are defined in migration 031_event_storage.sql.
  // We attempt to apply them here using the service role.
  // If exec_sql RPC is not available, the policies must be applied by
  // running the migration SQL directly in the Supabase SQL editor.

  const policies = [
    {
      name: "admin_upload_event_files",
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'storage'
              AND tablename = 'objects'
              AND policyname = 'admin_upload_event_files'
          ) THEN
            CREATE POLICY "admin_upload_event_files"
              ON storage.objects FOR INSERT
              TO authenticated
              WITH CHECK (
                bucket_id = 'event-files'
                AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
              );
          END IF;
        END $$;
      `,
    },
    {
      name: "admin_update_event_files",
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'storage'
              AND tablename = 'objects'
              AND policyname = 'admin_update_event_files'
          ) THEN
            CREATE POLICY "admin_update_event_files"
              ON storage.objects FOR UPDATE
              TO authenticated
              USING (
                bucket_id = 'event-files'
                AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
              );
          END IF;
        END $$;
      `,
    },
    {
      name: "admin_delete_event_files",
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'storage'
              AND tablename = 'objects'
              AND policyname = 'admin_delete_event_files'
          ) THEN
            CREATE POLICY "admin_delete_event_files"
              ON storage.objects FOR DELETE
              TO authenticated
              USING (
                bucket_id = 'event-files'
                AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
              );
          END IF;
        END $$;
      `,
    },
    {
      name: "authenticated_read_event_files",
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'storage'
              AND tablename = 'objects'
              AND policyname = 'authenticated_read_event_files'
          ) THEN
            CREATE POLICY "authenticated_read_event_files"
              ON storage.objects FOR SELECT
              TO authenticated
              USING (bucket_id = 'event-files');
          END IF;
        END $$;
      `,
    },
    {
      name: "public_read_event_files",
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'storage'
              AND tablename = 'objects'
              AND policyname = 'public_read_event_files'
          ) THEN
            CREATE POLICY "public_read_event_files"
              ON storage.objects FOR SELECT
              TO anon
              USING (bucket_id = 'event-files');
          END IF;
        END $$;
      `,
    },
  ];

  let policiesApplied = 0;
  let policiesSkipped = 0;

  for (const policy of policies) {
    // Try exec_sql RPC first
    const { error } = await supabase.rpc(
      "exec_sql" as never,
      {
        sql: policy.sql,
      } as never,
    );

    if (error) {
      // exec_sql not available — policies must be applied via migration SQL
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
    console.log(
      "    Run the SQL in src/lib/db/migrations/031_event_storage.sql",
    );
    console.log("    directly in the Supabase SQL editor to apply them.");
  } else {
    console.log(`\n✅  ${policiesApplied} storage policies applied.`);
  }

  console.log("\n✅  Event storage setup complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Bucket: ${BUCKET_NAME}`);
  console.log("  Path convention:");
  console.log("    Cover images:  events/{eventId}/cover/{filename}");
  console.log("    Attachments:   events/{eventId}/attachments/{filename}");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err) => {
  console.error("\n❌  Setup failed:", err.message);
  process.exit(1);
});
