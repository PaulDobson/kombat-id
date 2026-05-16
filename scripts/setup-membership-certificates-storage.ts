/**
 * Setup script — Membership Certificates Storage Bucket
 *
 * Creates the `membership-certificates` bucket in Supabase Storage.
 * - Admin can upload (on activation)
 * - Authenticated users can read their own certificate
 *
 * Usage:
 *   pnpm setup:certificates-storage
 *
 * Requirements:
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
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

const BUCKET_NAME = "membership-certificates";

async function main() {
  console.log("🪣  Setting up membership-certificates storage bucket...\n");

  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    console.error("❌  Failed to list buckets:", listError.message);
    process.exit(1);
  }

  const exists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (exists) {
    console.log(`ℹ️   Bucket "${BUCKET_NAME}" already exists — skipping.`);
  } else {
    const { error: createError } = await supabase.storage.createBucket(
      BUCKET_NAME,
      {
        public: false, // signed URLs required — certificates are private
        allowedMimeTypes: ["application/pdf"],
        fileSizeLimit: 5242880, // 5 MB
      },
    );

    if (createError) {
      console.error("❌  Failed to create bucket:", createError.message);
      process.exit(1);
    }

    console.log(`✅  Bucket "${BUCKET_NAME}" created.`);
    console.log("    - public: false (signed URLs)");
    console.log("    - allowedMimeTypes: application/pdf");
    console.log("    - fileSizeLimit: 5 MB");
  }

  // RLS policies
  console.log("\n🔒  Applying RLS policies...");

  const policies = [
    {
      name: "admin_upload_membership_certificates",
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'storage' AND tablename = 'objects'
              AND policyname = 'admin_upload_membership_certificates'
          ) THEN
            CREATE POLICY "admin_upload_membership_certificates"
              ON storage.objects FOR INSERT TO authenticated
              WITH CHECK (
                bucket_id = 'membership-certificates'
                AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
              );
          END IF;
        END $$;
      `,
    },
    {
      name: "owner_read_membership_certificate",
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'storage' AND tablename = 'objects'
              AND policyname = 'owner_read_membership_certificate'
          ) THEN
            CREATE POLICY "owner_read_membership_certificate"
              ON storage.objects FOR SELECT TO authenticated
              USING (
                bucket_id = 'membership-certificates'
                AND (
                  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
                  OR name LIKE (auth.uid()::text || '/%')
                  OR EXISTS (
                    SELECT 1 FROM public.practitioners p
                    WHERE p.auth_user_id = auth.uid()
                      AND name LIKE (p.id::text || '/%')
                  )
                )
              );
          END IF;
        END $$;
      `,
    },
  ];

  for (const policy of policies) {
    const { error } = await supabase.rpc(
      "exec_sql" as never,
      { sql: policy.sql } as never,
    );
    if (error) {
      console.warn(
        `   ⚠️  Could not apply "${policy.name}" via RPC: ${error.message}`,
      );
      console.warn("       Apply manually in Supabase SQL editor.");
    } else {
      console.log(`   ✓ "${policy.name}" applied`);
    }
  }

  console.log("\n✅  Membership certificates storage setup complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Bucket: ${BUCKET_NAME}`);
  console.log("  Path convention: {practitionerId}/membership-certificate.pdf");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(
    "⚠️  Also run this SQL in Supabase to add the certificate_path column:",
  );
  console.log(
    "   ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS certificate_path TEXT;\n",
  );
}

main().catch((err) => {
  console.error("\n❌  Setup failed:", err.message);
  process.exit(1);
});
