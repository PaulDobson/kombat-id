/**
 * assign-practitioners-to-academies.ts
 *
 * Asigna los practicantes existentes que NO tienen membresía activa
 * a las academias disponibles de forma distribuida (round-robin).
 *
 * NO modifica practicantes que ya tienen academia asignada.
 *
 * Usage:
 *   pnpm assign:academies
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

const BATCH_SIZE = 100;
const PAGE_SIZE = 1000;

async function main() {
  console.log("🔗  Asignando practicantes sin academia...\n");

  // ── Obtener academias activas ─────────────────────────────────────────────
  const { data: academies, error: academiesError } = await supabase
    .from("academies")
    .select("id, name")
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

  console.log(`✓ ${academies.length} academias activas encontradas`);
  academies.forEach((a) => console.log(`   • ${a.name}`));

  // ── Obtener IDs de practicantes que YA tienen membresía activa ────────────
  let allMembers: Array<{ practitioner_id: string }> = [];
  let membersPage = 0;

  while (true) {
    const { data: batch, error } = await supabase
      .from("academy_memberships")
      .select("practitioner_id")
      .eq("is_active", true)
      .range(membersPage * PAGE_SIZE, (membersPage + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error("❌  Error obteniendo membresías:", error.message);
      process.exit(1);
    }

    if (!batch?.length) break;
    allMembers = allMembers.concat(batch);
    membersPage++;
    if (batch.length < PAGE_SIZE) break;
  }

  const alreadyAssignedIds = new Set(allMembers.map((m) => m.practitioner_id));
  console.log(
    `\n✓ ${alreadyAssignedIds.size} practicantes ya tienen academia asignada`,
  );

  // ── Obtener todos los practicantes sin academia ───────────────────────────
  // Fetch in pages to avoid memory issues with 2234 records
  let allUnassigned: Array<{ id: string }> = [];
  let page = 0;

  while (true) {
    const { data: batch, error } = await supabase
      .from("practitioners")
      .select("id")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error("❌  Error obteniendo practicantes:", error.message);
      process.exit(1);
    }

    if (!batch?.length) break;

    const unassigned = batch.filter(
      (p: { id: string }) => !alreadyAssignedIds.has(p.id),
    );
    allUnassigned = allUnassigned.concat(unassigned);
    page++;

    if (batch.length < PAGE_SIZE) break;
  }

  console.log(
    `✓ ${allUnassigned.length} practicantes sin academia (serán asignados)\n`,
  );

  if (allUnassigned.length === 0) {
    console.log(
      "✅  Todos los practicantes ya tienen academia asignada. Nada que hacer.",
    );
    process.exit(0);
  }

  // ── Asignar en round-robin ────────────────────────────────────────────────
  console.log("🏫  Asignando academias (round-robin)...");

  const academyIds = academies.map((a) => a.id);
  const now = new Date().toISOString();
  let assigned = 0;
  let errors = 0;

  for (let i = 0; i < allUnassigned.length; i += BATCH_SIZE) {
    const chunk = allUnassigned.slice(i, i + BATCH_SIZE);

    const memberships = chunk.map((p, idx) => ({
      practitioner_id: p.id,
      academy_id: academyIds[(i + idx) % academyIds.length]!,
      is_active: true,
      joined_at: now,
    }));

    // Plain insert — we already filtered out practitioners with active memberships
    const { error } = await supabase
      .from("academy_memberships")
      .insert(memberships);

    if (error) {
      console.warn(
        `\n   ⚠️  Batch ${Math.floor(i / BATCH_SIZE) + 1} error: ${error.message}`,
      );
      errors += chunk.length;
    } else {
      assigned += chunk.length;
    }

    process.stdout.write(
      `\r   Procesados: ${Math.min(i + BATCH_SIZE, allUnassigned.length)}/${allUnassigned.length}`,
    );
  }

  // ── Estadísticas finales ──────────────────────────────────────────────────
  const { count: totalMemberships } = await supabase
    .from("academy_memberships")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: totalPractitioners } = await supabase
    .from("practitioners")
    .select("id", { count: "exact", head: true });

  console.log("\n\n✅  Asignación completada!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   Ya tenían academia:       ${alreadyAssignedIds.size}`);
  console.log(`   Asignados ahora:          ${assigned}`);
  if (errors > 0) {
    console.log(`   Con errores (omitidos):   ${errors}`);
  }
  console.log(`   Total membresías activas: ${totalMemberships}`);
  console.log(`   Total practicantes en BD: ${totalPractitioners}`);
  console.log(`   Academias utilizadas:     ${academies.length}`);
  console.log(
    `   Media por academia:       ${((totalMemberships ?? 0) / academies.length).toFixed(1)}`,
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err) => {
  console.error("\n❌  Error:", err.message);
  process.exit(1);
});
