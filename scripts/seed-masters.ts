/**
 * seed-masters.ts
 *
 * Genera un usuario maestro (auth user + practitioner con role='maestro')
 * para cada academia activa.
 *
 * Usage:
 *   pnpm seed:masters
 *
 * Requisitos:
 *   - .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 *   - Migraciones aplicadas (incluyendo 002_role_age_category_master_lineage)
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

const PASSWORD = "Kombat2025!";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Genera un RUT chileno válido con dígito verificador */
function generateRut(n: number): string {
  const num = 10_000_000 + n;
  const digits = String(num).split("").reverse().map(Number);
  const factors = [2, 3, 4, 5, 6, 7];
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i]! * factors[i % factors.length]!;
  }
  const remainder = 11 - (sum % 11);
  const dv =
    remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return `${num}-${dv}`;
}

/**
 * Normaliza el nombre de una academia a un email limpio.
 * "Academia KT Santiago Norte" → "maestro.santiago-norte@kombat.cl"
 */
function academyNameToEmail(name: string): string {
  const normalized = name
    .toLowerCase()
    // Quitar acentos
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Reemplazar espacios con guiones
    .replace(/\s+/g, "-")
    // Quitar "academia-kt-"
    .replace(/^academia-kt-/, "")
    // Quitar caracteres no permitidos en email local
    .replace(/[^a-z0-9-]/g, "");

  return `maestro.${normalized}@kombat.cl`;
}

/**
 * Extrae el nombre corto de la academia para el full_name del maestro.
 * "Academia KT Santiago Norte" → "Santiago Norte"
 */
function academyNameToShortName(name: string): string {
  return name.replace(/^Academia KT\s*/i, "").trim();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🥋  Iniciando seed de maestros por academia...\n");

  // ── Obtener academias activas ─────────────────────────────────────────────
  const { data: academies, error: academiesError } = await supabase
    .from("academies")
    .select("id, name, responsible_instructor_ids")
    .eq("is_active", true);

  if (academiesError) {
    console.error("❌  Error obteniendo academias:", academiesError.message);
    process.exit(1);
  }

  if (!academies?.length) {
    console.error(
      "❌  No hay academias activas. Ejecuta pnpm seed:academies primero.",
    );
    process.exit(1);
  }

  console.log(`✓ ${academies.length} academias activas encontradas\n`);

  // Pre-cargar lista de auth users para resolver duplicados
  const {
    data: { users: allAuthUsers },
  } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  // ── Procesar cada academia ────────────────────────────────────────────────
  const results: Array<{
    email: string;
    academy: string;
    status: "created" | "skipped";
  }> = [];
  let created = 0;
  let skipped = 0;

  for (let idx = 0; idx < academies.length; idx++) {
    const academy = academies[idx]!;
    const email = academyNameToEmail(academy.name);
    const shortName = academyNameToShortName(academy.name);
    const fullName = `Maestro ${shortName}`;

    console.log(`\n🏫  ${academy.name}`);
    console.log(`   Email: ${email}`);

    try {
      // ── a. Crear o recuperar auth user ──────────────────────────────────
      let authUserId: string;

      const { data: createData, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          password: PASSWORD,
          email_confirm: true,
        });

      if (!createError) {
        authUserId = createData.user.id;
        console.log(`   ✓ Auth user creado: ${authUserId}`);
      } else if (
        createError.message.includes("already been registered") ||
        createError.message.includes("already exists")
      ) {
        // Recuperar el user_id existente
        const existing = allAuthUsers.find((u) => u.email === email);
        if (!existing) {
          console.warn(
            `   ⚠️  Usuario ya existe pero no se pudo encontrar en listUsers. Omitiendo.`,
          );
          skipped++;
          results.push({ email, academy: academy.name, status: "skipped" });
          continue;
        }
        authUserId = existing.id;
        console.log(`   ⏭  Auth user ya existe: ${authUserId}`);
      } else {
        console.error(`   ❌  Error creando auth user: ${createError.message}`);
        skipped++;
        results.push({ email, academy: academy.name, status: "skipped" });
        continue;
      }

      // ── b. Verificar si ya existe un practitioner con ese auth_user_id ──
      const { data: existingPractitioner } = await supabase
        .from("practitioners")
        .select("id")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (existingPractitioner) {
        console.log(
          `   ⏭  Practitioner ya existe (${existingPractitioner.id}). Omitiendo.`,
        );
        skipped++;
        results.push({ email, academy: academy.name, status: "skipped" });
        continue;
      }

      // ── c. Crear el practitioner ─────────────────────────────────────────
      const rut = generateRut(90_000_000 + idx);

      const { data: practitioner, error: practitionerError } = await supabase
        .from("practitioners")
        .insert({
          role: "maestro",
          grade: "black",
          dan: 5,
          full_name: fullName,
          rut,
          birth_date: "1975-01-01",
          gender: "male",
          start_date: "2000-01-01",
          is_active: true,
          auth_user_id: authUserId,
          contact_email: email,
        })
        .select("id")
        .single();

      if (practitionerError) {
        console.error(
          `   ❌  Error creando practitioner: ${practitionerError.message}`,
        );
        skipped++;
        results.push({ email, academy: academy.name, status: "skipped" });
        continue;
      }

      const practitionerId = practitioner.id as string;
      console.log(`   ✓ Practitioner creado: ${practitionerId}`);

      // ── d. Crear membresía activa en la academia ─────────────────────────
      const { error: membershipError } = await supabase
        .from("academy_memberships")
        .insert({
          academy_id: academy.id,
          practitioner_id: practitionerId,
          is_active: true,
          joined_at: new Date().toISOString().split("T")[0],
        });

      if (membershipError) {
        console.warn(
          `   ⚠️  Error creando membresía: ${membershipError.message}`,
        );
      } else {
        console.log(`   ✓ Membresía creada`);
      }

      // ── e. Actualizar responsible_instructor_ids de la academia ──────────
      const currentIds: string[] = academy.responsible_instructor_ids ?? [];
      if (!currentIds.includes(practitionerId)) {
        const { error: updateError } = await supabase
          .from("academies")
          .update({
            responsible_instructor_ids: [...currentIds, practitionerId],
          })
          .eq("id", academy.id);

        if (updateError) {
          console.warn(
            `   ⚠️  Error actualizando responsible_instructor_ids: ${updateError.message}`,
          );
        } else {
          console.log(`   ✓ Academia actualizada con nuevo maestro`);
        }
      }

      created++;
      results.push({ email, academy: academy.name, status: "created" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`   ❌  Error inesperado: ${message}`);
      skipped++;
      results.push({ email, academy: academy.name, status: "skipped" });
    }
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log("\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅  Seed de maestros completado!");
  console.log(`   Maestros creados:   ${created}`);
  console.log(`   Ya existían:        ${skipped}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n   Detalle:");
  for (const r of results) {
    const icon = r.status === "created" ? "✓" : "⏭";
    console.log(`   ${icon}  ${r.email}  →  ${r.academy}`);
  }
  console.log("");
}

main().catch((err) => {
  console.error("\n❌  Error:", err.message);
  process.exit(1);
});
