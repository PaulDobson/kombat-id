/**
 * Seed script — Kombat Taekwondo Identity
 *
 * Asume que los auth users ya existen en Supabase.
 * Los busca por email, reutiliza sus IDs, y recrea todos los datos de BD.
 *
 * Usage:
 *   pnpm seed
 *
 * Requisitos:
 *   - .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 *   - Migraciones 001, 002, 003 aplicadas en Supabase
 *   - Los usuarios auth deben existir previamente (créalos en Supabase Dashboard
 *     o con el script scripts/create-auth-users.ts)
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uuid() {
  return crypto.randomUUID();
}

/** Busca un auth user por email usando la API REST de Supabase Auth */
async function findAuthUserId(email: string): Promise<string | null> {
  // Paginar hasta encontrar el usuario
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 50,
    });
    if (error || !data?.users?.length) break;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < 50) break; // última página
    page++;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Definición de usuarios seed
// ---------------------------------------------------------------------------

const SEED_USERS = [
  {
    email: "admin@kombat.cl",
    isAdmin: true,
    practitioner: null,
  },
  {
    email: "maestro@kombat.cl",
    isAdmin: false,
    practitioner: {
      rut: "12345678-9",
      full_name: "Carlos Maestro Rojas",
      birth_date: "1975-03-15",
      gender: "male",
      grade: "black",
      dan: 5,
      start_date: "1990-01-01",
      weight_kg: 78,
      role: "maestro",
      contact_email: "maestro@kombat.cl",
      contact_phone: "+56912345678",
    },
  },
  {
    email: "profesor@kombat.cl",
    isAdmin: false,
    practitioner: {
      rut: "11222333-4",
      full_name: "Ana Profesora Vidal",
      birth_date: "1985-07-22",
      gender: "female",
      grade: "black",
      dan: 2,
      start_date: "2000-03-10",
      weight_kg: 62,
      role: "profesor",
      contact_email: "profesor@kombat.cl",
      contact_phone: "+56987654321",
    },
  },
  {
    email: "instructor@kombat.cl",
    isAdmin: false,
    practitioner: {
      rut: "15666777-8",
      full_name: "Diego Instructor Mora",
      birth_date: "1992-11-05",
      gender: "male",
      grade: "red",
      dan: null,
      start_date: "2008-06-01",
      weight_kg: 72,
      role: "instructor",
      contact_email: "instructor@kombat.cl",
      contact_phone: "+56911223344",
    },
  },
  {
    email: "alumno.adulto@kombat.cl",
    isAdmin: false,
    practitioner: {
      rut: "19888999-0",
      full_name: "Sofía Alumna Torres",
      birth_date: "1998-04-18",
      gender: "female",
      grade: "blue",
      dan: null,
      start_date: "2019-02-15",
      weight_kg: 58,
      role: "alumno",
      contact_email: "alumno.adulto@kombat.cl",
      contact_phone: "+56955667788",
    },
  },
  {
    email: "alumno.juvenil@kombat.cl",
    isAdmin: false,
    practitioner: {
      rut: "22111222-3",
      full_name: "Mateo Alumno Pérez",
      birth_date: "2010-09-30",
      gender: "male",
      grade: "yellow",
      dan: null,
      start_date: "2022-03-01",
      weight_kg: 45,
      role: "alumno",
      contact_email: "alumno.juvenil@kombat.cl",
      contact_phone: null,
    },
  },
  {
    email: "alumno.inactivo@kombat.cl",
    isAdmin: false,
    practitioner: {
      rut: "17444555-6",
      full_name: "Pedro Inactivo Soto",
      birth_date: "1990-12-01",
      gender: "male",
      grade: "green",
      dan: null,
      start_date: "2015-05-20",
      weight_kg: 80,
      role: "alumno",
      is_active: false,
      deactivated_at: "2023-06-01T00:00:00Z",
      deactivation_reason: "Retiro voluntario de la organización",
      contact_email: "alumno.inactivo@kombat.cl",
      contact_phone: null,
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱  Starting seed...\n");

  // ── 1. Resolver IDs de auth users existentes ──────────────────────────────
  console.log("🔍  Buscando auth users existentes...");
  const authIds: Record<string, string> = {};

  for (const u of SEED_USERS) {
    const id = await findAuthUserId(u.email);
    if (!id) {
      console.error(`❌  Usuario no encontrado: ${u.email}`);
      console.error(
        "    Crea los usuarios primero en Supabase Dashboard > Authentication > Users",
      );
      console.error("    o ejecuta: pnpm seed:users");
      process.exit(1);
    }
    authIds[u.email] = id;
    console.log(`   ✓ ${u.email}  (${id})`);
  }

  // ── 2. Limpiar datos de BD anteriores (no los auth users) ─────────────────
  console.log("\n🧹  Limpiando datos anteriores...");
  const ruts = SEED_USERS.filter((u) => u.practitioner).map(
    (u) => u.practitioner!.rut,
  );

  // Orden inverso por FK: primero los hijos, luego los padres
  await supabase
    .from("ranking_snapshots")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("ranking_positions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("certifications")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("martial_history")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("martial_events")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("academy_memberships")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("academies")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("practitioners").delete().in("rut", ruts);
  await supabase
    .from("admin_users")
    .delete()
    .neq("user_id", "00000000-0000-0000-0000-000000000000");
  console.log("   ✓ Datos anteriores eliminados");

  // ── 3. Rol admin ──────────────────────────────────────────────────────────
  const adminId = authIds["admin@kombat.cl"];
  const { error: adminErr } = await supabase
    .from("admin_users")
    .insert({ user_id: adminId });
  if (adminErr) throw new Error(`admin_users: ${adminErr.message}`);
  console.log("\n🔑  Rol admin asignado a admin@kombat.cl");

  // ── 4. Perfiles de practicantes ───────────────────────────────────────────
  console.log("\n🥋  Creando perfiles de practicantes...");
  const practitionerIds: Record<string, string> = {};

  for (const u of SEED_USERS) {
    if (!u.practitioner) continue;
    const pid = uuid();
    practitionerIds[u.email] = pid;

    const p = u.practitioner as Record<string, unknown>;
    const { role, is_active, deactivated_at, deactivation_reason, ...core } = p;

    const row: Record<string, unknown> = {
      id: pid,
      auth_user_id: authIds[u.email],
      qr_token: uuid(),
      is_active: is_active ?? true,
      deactivated_at: deactivated_at ?? null,
      deactivation_reason: deactivation_reason ?? null,
      ...core,
    };

    const { error } = await supabase.from("practitioners").insert(row);
    if (error) throw new Error(`practitioners(${u.email}): ${error.message}`);

    // Asignar role (columna de migración 002)
    if (role) {
      const { error: roleErr } = await supabase
        .from("practitioners")
        .update({ role } as Record<string, unknown>)
        .eq("id", pid);
      if (roleErr) {
        console.warn(
          `   ⚠️  role no actualizado para ${u.email}: ${roleErr.message}`,
        );
      }
    }

    console.log(`   ✓ ${p.full_name}  [${role ?? "alumno"}]`);
  }

  const maestroId = practitionerIds["maestro@kombat.cl"]!;
  const profesorId = practitionerIds["profesor@kombat.cl"]!;
  const instructorId = practitionerIds["instructor@kombat.cl"]!;
  const alumnoAdultoId = practitionerIds["alumno.adulto@kombat.cl"]!;
  const alumnoJuvenilId = practitionerIds["alumno.juvenil@kombat.cl"]!;

  // ── 5. Eventos marciales ──────────────────────────────────────────────────
  console.log("\n📅  Creando eventos marciales...");
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

  const eventDefs = [
    {
      name: "Campeonato Nacional 2025",
      event_type: "competition",
      event_date: fmt(addDays(today, 30)),
      location: "Gimnasio Municipal, Santiago",
    },
    {
      name: "Seminario Técnico Avanzado",
      event_type: "seminar",
      event_date: fmt(addDays(today, 15)),
      location: "Academia Central, Valparaíso",
    },
    {
      name: "Examen de Grado — Cinturón Azul",
      event_type: "exam",
      event_date: fmt(addDays(today, 7)),
      location: "Dojo Principal, Santiago",
    },
    {
      name: "Copa Regional Metropolitana",
      event_type: "competition",
      event_date: fmt(addDays(today, -20)),
      location: "Polideportivo Las Condes",
    },
    {
      name: "Seminario de Arbitraje",
      event_type: "seminar",
      event_date: fmt(addDays(today, -45)),
      location: "Sede FKTC, Santiago",
    },
    {
      name: "Examen de Grado — Cinturón Negro",
      event_type: "exam",
      event_date: fmt(addDays(today, -90)),
      location: "Dojo Principal, Santiago",
    },
  ];

  const eventIds: string[] = [];
  for (const ev of eventDefs) {
    const { data, error } = await supabase
      .from("martial_events")
      .insert({ ...ev, created_by: adminId })
      .select("id")
      .single();
    if (error) throw new Error(`martial_events: ${error.message}`);
    eventIds.push(data.id);
    console.log(`   ✓ ${ev.name}`);
  }

  // ── 6. Historial marcial ──────────────────────────────────────────────────
  console.log("\n📋  Creando historial marcial...");
  const historyEntries = [
    {
      practitioner_id: maestroId,
      event_id: eventIds[3],
      event_type: "competition",
      event_date: fmt(addDays(today, -20)),
      result: "1st",
      notes: "Categoría -80kg negro",
    },
    {
      practitioner_id: maestroId,
      event_id: eventIds[4],
      event_type: "seminar",
      event_date: fmt(addDays(today, -45)),
      result: "passed",
      notes: "Instructor certificado",
    },
    {
      practitioner_id: maestroId,
      event_id: eventIds[5],
      event_type: "exam",
      event_date: fmt(addDays(today, -90)),
      result: "passed",
      notes: "Promoción 5° Dan",
    },
    {
      practitioner_id: profesorId,
      event_id: eventIds[3],
      event_type: "competition",
      event_date: fmt(addDays(today, -20)),
      result: "2nd",
      notes: "Categoría -65kg negro",
    },
    {
      practitioner_id: profesorId,
      event_id: eventIds[4],
      event_type: "seminar",
      event_date: fmt(addDays(today, -45)),
      result: "passed",
    },
    {
      practitioner_id: instructorId,
      event_id: eventIds[3],
      event_type: "competition",
      event_date: fmt(addDays(today, -20)),
      result: "3rd",
      notes: "Categoría -75kg rojo",
    },
    {
      practitioner_id: alumnoAdultoId,
      event_id: eventIds[3],
      event_type: "competition",
      event_date: fmt(addDays(today, -20)),
      result: "participant",
      notes: "Primera competencia",
    },
    {
      practitioner_id: alumnoAdultoId,
      event_id: eventIds[4],
      event_type: "seminar",
      event_date: fmt(addDays(today, -45)),
      result: "passed",
    },
    {
      practitioner_id: alumnoJuvenilId,
      event_id: eventIds[4],
      event_type: "seminar",
      event_date: fmt(addDays(today, -45)),
      result: "passed",
      notes: "Categoría infantil",
    },
  ];

  for (const entry of historyEntries) {
    const { error } = await supabase
      .from("martial_history")
      .insert({ ...entry, recorded_by: adminId });
    if (error) throw new Error(`martial_history: ${error.message}`);
  }
  console.log(`   ✓ ${historyEntries.length} entradas`);

  // ── 7. Certificaciones ────────────────────────────────────────────────────
  console.log("\n🎖️   Creando certificaciones...");
  const snap = (
    id: string,
    name: string,
    rut: string,
    grade: string,
    dan: number | null,
  ) => ({
    id,
    fullName: name,
    rut,
    grade,
    dan,
    snapshotAt: new Date().toISOString(),
  });

  const certs = [
    {
      id: uuid(),
      practitioner_id: maestroId,
      cert_type: "technical_grade",
      issued_by: adminId,
      is_revoked: false,
      practitioner_snapshot: snap(
        maestroId,
        "Carlos Maestro Rojas",
        "12345678-9",
        "black",
        5,
      ),
      notes: "5° Dan",
    },
    {
      id: uuid(),
      practitioner_id: maestroId,
      cert_type: "instructor",
      issued_by: adminId,
      is_revoked: false,
      practitioner_snapshot: snap(
        maestroId,
        "Carlos Maestro Rojas",
        "12345678-9",
        "black",
        5,
      ),
      notes: "Instructor Nacional",
    },
    {
      id: uuid(),
      practitioner_id: profesorId,
      cert_type: "technical_grade",
      issued_by: adminId,
      is_revoked: false,
      practitioner_snapshot: snap(
        profesorId,
        "Ana Profesora Vidal",
        "11222333-4",
        "black",
        2,
      ),
      notes: "2° Dan",
    },
    {
      id: uuid(),
      practitioner_id: profesorId,
      cert_type: "referee",
      issued_by: adminId,
      is_revoked: false,
      practitioner_snapshot: snap(
        profesorId,
        "Ana Profesora Vidal",
        "11222333-4",
        "black",
        2,
      ),
      notes: "Árbitro Nacional",
    },
    {
      id: uuid(),
      practitioner_id: instructorId,
      cert_type: "instructor",
      issued_by: adminId,
      is_revoked: false,
      practitioner_snapshot: snap(
        instructorId,
        "Diego Instructor Mora",
        "15666777-8",
        "red",
        null,
      ),
      notes: "Instructor Regional",
    },
    {
      id: uuid(),
      practitioner_id: alumnoAdultoId,
      cert_type: "event_participation",
      issued_by: adminId,
      is_revoked: false,
      practitioner_snapshot: snap(
        alumnoAdultoId,
        "Sofía Alumna Torres",
        "19888999-0",
        "blue",
        null,
      ),
      notes: "Copa Regional 2024",
    },
    {
      id: uuid(),
      practitioner_id: alumnoAdultoId,
      cert_type: "technical_grade",
      issued_by: adminId,
      is_revoked: true,
      revoked_at: new Date().toISOString(),
      revocation_reason: "Error administrativo",
      revoked_by: adminId,
      practitioner_snapshot: snap(
        alumnoAdultoId,
        "Sofía Alumna Torres",
        "19888999-0",
        "blue",
        null,
      ),
      notes: "Cinturón Azul (revocada)",
    },
  ];

  for (const cert of certs) {
    const { error } = await supabase.from("certifications").insert(cert);
    if (error) throw new Error(`certifications: ${error.message}`);
  }
  console.log(`   ✓ ${certs.length} certificaciones`);

  // ── 8. Ranking ────────────────────────────────────────────────────────────
  console.log("\n🏆  Creando ranking...");
  const rankings = [
    {
      practitioner_id: maestroId,
      grade: "black",
      age_range: "30+",
      weight_category: "middle",
      total_points: 250,
      position: 1,
      category_count: 5,
    },
    {
      practitioner_id: profesorId,
      grade: "black",
      age_range: "18-30",
      weight_category: "light",
      total_points: 170,
      position: 1,
      category_count: 4,
    },
    {
      practitioner_id: instructorId,
      grade: "red",
      age_range: "18-30",
      weight_category: "welter",
      total_points: 50,
      position: 1,
      category_count: 3,
    },
    {
      practitioner_id: alumnoAdultoId,
      grade: "blue",
      age_range: "18-30",
      weight_category: "feather",
      total_points: 10,
      position: 2,
      category_count: 8,
    },
    {
      practitioner_id: alumnoJuvenilId,
      grade: "yellow",
      age_range: "12-17",
      weight_category: "fly",
      total_points: 10,
      position: 1,
      category_count: 6,
    },
  ];

  for (const r of rankings) {
    const { error } = await supabase.from("ranking_positions").insert(r);
    if (error) throw new Error(`ranking_positions: ${error.message}`);
  }

  for (let i = 1; i <= 3; i++) {
    const d = addDays(today, -i * 30);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    await supabase
      .from("ranking_snapshots")
      .insert({
        practitioner_id: maestroId,
        period_type: "monthly",
        period_label: label,
        position: i,
        total_points: 250 - i * 20,
        category_count: 5,
        grade: "black",
        age_range: "30+",
        weight_category: "middle",
      });
  }
  console.log(`   ✓ ${rankings.length} posiciones + 3 snapshots`);

  // ── 9. Academia ───────────────────────────────────────────────────────────
  console.log("\n🏫  Creando academia...");
  const { error: acErr } = await supabase.from("academies").insert({
    name: "Academia Kombat Taekwondo Santiago Centro",
    region: "metropolitana",
    city: "Santiago",
    address: "Av. Libertador Bernardo O'Higgins 1234",
    founded_date: "2005-03-15",
    is_active: true,
    responsible_instructor_ids: [maestroId, profesorId],
    created_by: adminId,
  });
  if (acErr) throw new Error(`academies: ${acErr.message}`);
  console.log("   ✓ Academia Santiago Centro");

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log("\n✅  Seed completo!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  CREDENCIALES (contraseña: Kombat2025!)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  admin@kombat.cl           → Admin");
  console.log("  maestro@kombat.cl         → Maestro  | Negro 5° Dan");
  console.log("  profesor@kombat.cl        → Profesor | Negro 2° Dan");
  console.log("  instructor@kombat.cl      → Instructor | Rojo");
  console.log("  alumno.adulto@kombat.cl   → Alumno adulto | Azul");
  console.log("  alumno.juvenil@kombat.cl  → Alumno juvenil | Amarillo");
  console.log("  alumno.inactivo@kombat.cl → Alumno inactivo | Verde");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err) => {
  console.error("\n❌  Seed failed:", err.message);
  process.exit(1);
});
