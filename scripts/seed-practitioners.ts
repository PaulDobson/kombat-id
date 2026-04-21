/**
 * seed-practitioners.ts
 *
 * Genera 300 practicantes de prueba distribuidos en academias, con
 * direcciones, instructores asignados y membresías de academia.
 *
 * NO elimina datos existentes — solo inserta nuevos registros.
 *
 * Usage:
 *   pnpm tsx scripts/seed-practitioners.ts
 *
 * Requisitos:
 *   - .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 *   - Al menos un admin en admin_users (para usar como created_by)
 *   - Migraciones aplicadas (incluyendo 026_practitioner_address_instructor)
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
// Data pools
// ---------------------------------------------------------------------------

const FIRST_NAMES_M = [
  "Alejandro",
  "Andrés",
  "Bastián",
  "Carlos",
  "Cristóbal",
  "Daniel",
  "Diego",
  "Eduardo",
  "Felipe",
  "Francisco",
  "Gabriel",
  "Gonzalo",
  "Ignacio",
  "Javier",
  "Jorge",
  "José",
  "Juan",
  "Julio",
  "Kevin",
  "Leonardo",
  "Luis",
  "Mateo",
  "Matías",
  "Miguel",
  "Nicolás",
  "Pablo",
  "Pedro",
  "Rafael",
  "Ricardo",
  "Roberto",
  "Rodrigo",
  "Sebastián",
  "Tomás",
  "Vicente",
  "Víctor",
];

const FIRST_NAMES_F = [
  "Alejandra",
  "Amanda",
  "Ana",
  "Bárbara",
  "Camila",
  "Carolina",
  "Catalina",
  "Claudia",
  "Constanza",
  "Daniela",
  "Fernanda",
  "Francisca",
  "Gabriela",
  "Isidora",
  "Javiera",
  "Jessica",
  "Josefina",
  "Karen",
  "Laura",
  "Lorena",
  "Lucía",
  "Macarena",
  "María",
  "Martina",
  "Michelle",
  "Natalia",
  "Nicole",
  "Pamela",
  "Patricia",
  "Paula",
  "Sofía",
  "Valentina",
  "Valeria",
  "Verónica",
];

const LAST_NAMES = [
  "Aguilera",
  "Araya",
  "Bravo",
  "Cáceres",
  "Castro",
  "Contreras",
  "Cortés",
  "Díaz",
  "Espinoza",
  "Fernández",
  "Flores",
  "Fuentes",
  "García",
  "Gómez",
  "González",
  "Gutiérrez",
  "Hernández",
  "Herrera",
  "Jiménez",
  "Lagos",
  "López",
  "Martínez",
  "Medina",
  "Mendoza",
  "Miranda",
  "Molina",
  "Morales",
  "Moreno",
  "Muñoz",
  "Navarro",
  "Núñez",
  "Ojeda",
  "Ortiz",
  "Parra",
  "Pérez",
  "Ramírez",
  "Reyes",
  "Rivera",
  "Rojas",
  "Romero",
  "Ruiz",
  "Sánchez",
  "Silva",
  "Soto",
  "Torres",
  "Vargas",
  "Vásquez",
  "Vega",
  "Vera",
  "Zamora",
];

const GRADES = ["white", "yellow", "green", "blue", "red", "black"] as const;
// Weighted distribution: more beginners than advanced
const GRADE_WEIGHTS = [30, 25, 20, 12, 8, 5];

const REGIONS = [
  "metropolitana",
  "valparaiso",
  "biobio",
  "araucania",
  "maule",
  "coquimbo",
  "ohiggins",
  "los_lagos",
  "antofagasta",
  "tarapaca",
];

const CITIES: Record<string, string[]> = {
  metropolitana: [
    "Santiago",
    "Maipú",
    "La Florida",
    "Puente Alto",
    "Las Condes",
    "Ñuñoa",
  ],
  valparaiso: [
    "Valparaíso",
    "Viña del Mar",
    "Quilpué",
    "Villa Alemana",
    "San Antonio",
  ],
  biobio: ["Concepción", "Talcahuano", "Los Ángeles", "Chillán"],
  araucania: ["Temuco", "Villarrica", "Pucón", "Angol"],
  maule: ["Talca", "Curicó", "Linares", "Constitución"],
  coquimbo: ["La Serena", "Coquimbo", "Ovalle", "Illapel"],
  ohiggins: ["Rancagua", "San Fernando", "Pichilemu"],
  los_lagos: ["Puerto Montt", "Osorno", "Castro", "Ancud"],
  antofagasta: ["Antofagasta", "Calama", "Tocopilla"],
  tarapaca: ["Iquique", "Alto Hospicio"],
};

const STREETS = [
  "Av. Libertador",
  "Calle Los Aromos",
  "Pasaje Las Flores",
  "Av. Principal",
  "Calle Nueva",
  "Av. Los Leones",
  "Calle San Martín",
  "Av. Providencia",
  "Calle Larga",
  "Av. Independencia",
  "Calle O'Higgins",
  "Av. Balmaceda",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickWeighted<T>(arr: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return arr[i]!;
  }
  return arr[arr.length - 1]!;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startYear: number, endYear: number): string {
  const y = randomInt(startYear, endYear);
  const m = randomInt(1, 12);
  const d = randomInt(1, 28);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱  Iniciando seed de 300 practicantes...\n");

  // ── Obtener admin ID ──────────────────────────────────────────────────────
  const { data: admins } = await supabase
    .from("admin_users")
    .select("user_id")
    .limit(1);
  if (!admins?.length) {
    console.error(
      "❌  No hay admins en admin_users. Ejecuta pnpm seed primero.",
    );
    process.exit(1);
  }
  const adminId = admins[0]!.user_id as string;
  console.log(`✓ Admin ID: ${adminId}`);

  // ── Obtener o crear academias ─────────────────────────────────────────────
  const { data: existingAcademies } = await supabase
    .from("academies")
    .select("id, name, responsible_instructor_ids")
    .eq("is_active", true);

  let academies: Array<{
    id: string;
    name: string;
    responsible_instructor_ids: string[];
  }> = (existingAcademies ?? []) as Array<{
    id: string;
    name: string;
    responsible_instructor_ids: string[];
  }>;

  if (academies.length < 5) {
    console.log("\n🏫  Creando academias de prueba...");

    // Get available instructors to assign as responsible
    const { data: instructorRows } = await supabase
      .from("practitioners")
      .select("id")
      .in("role", ["instructor", "profesor", "maestro"])
      .eq("is_active", true);
    const availableInstructors = (instructorRows ?? []).map(
      (r: { id: string }) => r.id,
    );

    const academyDefs = [
      {
        name: "Academia KT Santiago Norte",
        region: "metropolitana",
        city: "Maipú",
      },
      {
        name: "Academia KT Santiago Sur",
        region: "metropolitana",
        city: "La Florida",
      },
      {
        name: "Academia KT Valparaíso",
        region: "valparaiso",
        city: "Viña del Mar",
      },
      { name: "Academia KT Concepción", region: "biobio", city: "Concepción" },
      { name: "Academia KT Temuco", region: "araucania", city: "Temuco" },
      { name: "Academia KT La Serena", region: "coquimbo", city: "La Serena" },
    ];

    for (let i = 0; i < academyDefs.length; i++) {
      const def = academyDefs[i]!;
      // Assign 1-2 instructors per academy (round-robin from available)
      const responsibleIds =
        availableInstructors.length > 0
          ? [availableInstructors[i % availableInstructors.length]!]
          : [];

      const { data } = await supabase
        .from("academies")
        .insert({
          ...def,
          address: `${pick(STREETS)} ${randomInt(100, 9999)}`,
          is_active: true,
          responsible_instructor_ids: responsibleIds,
          created_by: adminId,
        })
        .select("id, name, responsible_instructor_ids")
        .single();
      if (data) {
        academies.push(
          data as {
            id: string;
            name: string;
            responsible_instructor_ids: string[];
          },
        );
        console.log(`   ✓ ${def.name}`);
      }
    }
  } else {
    console.log(`✓ Usando ${academies.length} academias existentes`);
  }

  const academyIds = academies.map((a) => a.id);

  // ── Obtener instructores existentes ───────────────────────────────────────
  const { data: instructorRows } = await supabase
    .from("practitioners")
    .select("id")
    .in("role", ["instructor", "profesor", "maestro"])
    .eq("is_active", true);
  const instructorIds = (instructorRows ?? []).map((r: { id: string }) => r.id);
  console.log(`✓ ${instructorIds.length} instructores disponibles`);

  // ── Generar practicantes en batches ───────────────────────────────────────
  console.log("\n🥋  Generando 300 practicantes...");

  const TOTAL = 300;
  const BATCH_SIZE = 50;
  let created = 0;
  let skipped = 0;

  // Track which practitioners get assigned to which academy
  const membershipQueue: Array<{
    practitioner_id: string;
    academy_id: string;
  }> = [];

  for (let batch = 0; batch < Math.ceil(TOTAL / BATCH_SIZE); batch++) {
    const rows = [];
    const batchSize = Math.min(BATCH_SIZE, TOTAL - batch * BATCH_SIZE);

    for (let i = 0; i < batchSize; i++) {
      const globalIdx = batch * BATCH_SIZE + i;
      const gender = Math.random() < 0.6 ? "male" : "female";
      const firstName =
        gender === "male" ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
      const lastName1 = pick(LAST_NAMES);
      const lastName2 = pick(LAST_NAMES);
      const fullName = `${firstName} ${lastName1} ${lastName2}`;

      const grade = pickWeighted([...GRADES], GRADE_WEIGHTS);
      const dan = grade === "black" ? randomInt(1, 5) : null;

      // Age: mix of categories
      const ageGroup = Math.random();
      let birthYear: number;
      if (ageGroup < 0.15)
        birthYear = randomInt(2008, 2014); // infantil/juvenil
      else if (ageGroup < 0.35)
        birthYear = randomInt(2005, 2007); // juvenil
      else if (ageGroup < 0.8)
        birthYear = randomInt(1985, 2004); // adulto
      else birthYear = randomInt(1960, 1984); // senior

      const region = pick(REGIONS);
      const city = pick(CITIES[region] ?? ["Santiago"]);

      const startYear = Math.max(birthYear + 6, 2000);
      const startDate = randomDate(startYear, 2024);

      const instructorId =
        instructorIds.length > 0 && Math.random() < 0.7
          ? pick(instructorIds)
          : null;

      const isActive = Math.random() > 0.08; // ~8% inactivos

      // Assign to exactly one academy (round-robin for even distribution)
      const assignedAcademyId = academyIds[globalIdx % academyIds.length]!;

      rows.push({
        id: crypto.randomUUID(),
        qr_token: crypto.randomUUID(),
        rut: generateRut(globalIdx + 1000),
        full_name: fullName,
        birth_date: randomDate(birthYear, birthYear),
        gender,
        grade,
        dan,
        start_date: startDate,
        is_active: isActive,
        weight_kg: randomInt(40, 110) + Math.round(Math.random() * 9) / 10,
        role: "alumno",
        address_street: `${pick(STREETS)} ${randomInt(100, 9999)}`,
        address_city: city,
        address_region: region,
        instructor_id: null, // relationship is via academy, not direct
        contact_email: null,
        contact_phone: null,
        auth_user_id: null,
        deactivated_at: isActive ? null : new Date().toISOString(),
        deactivation_reason: isActive ? null : "Retiro voluntario",
        _academyId: assignedAcademyId, // temp field for membership creation
      });
    }

    const { data: inserted, error } = await supabase
      .from("practitioners")
      .insert(rows.map(({ _academyId: _, ...r }) => r)) // strip temp field
      .select("id");

    if (error) {
      console.warn(`   ⚠️  Batch ${batch + 1} error: ${error.message}`);
      skipped += rows.length;
    } else {
      created += (inserted ?? []).length;

      // Each student gets exactly one membership to their pre-assigned academy
      for (let i = 0; i < (inserted ?? []).length; i++) {
        const p = inserted![i]!;
        const academyId = rows[i]!._academyId;
        membershipQueue.push({
          practitioner_id: p.id as string,
          academy_id: academyId,
        });
      }

      process.stdout.write(`\r   Creados: ${created}/${TOTAL}`);
    }
  }

  console.log(`\n   ✓ ${created} practicantes creados, ${skipped} omitidos`);

  // ── Crear membresías de academia ──────────────────────────────────────────
  console.log("\n🏫  Asignando practicantes a academias...");

  // Every student already has exactly one academy assigned — no deduplication needed
  const membershipsToInsert = membershipQueue;

  // Insert in batches
  for (let i = 0; i < membershipsToInsert.length; i += BATCH_SIZE) {
    const batch = membershipsToInsert.slice(i, i + BATCH_SIZE).map((m) => ({
      ...m,
      is_active: true,
      joined_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("academy_memberships").insert(batch);
    if (error) console.warn(`   ⚠️  Memberships batch error: ${error.message}`);
  }

  console.log(
    `   ✓ ${membershipsToInsert.length} membresías creadas (1 por alumno)`,
  );

  // ── Asignar instructores a academias ──────────────────────────────────────
  // Ensure each academy has at least one instructor in responsible_instructor_ids
  console.log("\n👨‍🏫  Verificando instructores por academia...");
  for (const academy of academies) {
    if (
      academy.responsible_instructor_ids.length === 0 &&
      instructorIds.length > 0
    ) {
      const assignedInstructor =
        instructorIds[Math.floor(Math.random() * instructorIds.length)]!;
      await supabase
        .from("academies")
        .update({ responsible_instructor_ids: [assignedInstructor] })
        .eq("id", academy.id);
      // Also ensure the instructor has a membership in this academy
      await supabase.from("academy_memberships").upsert(
        {
          practitioner_id: assignedInstructor,
          academy_id: academy.id,
          is_active: true,
          joined_at: new Date().toISOString(),
        },
        { onConflict: "practitioner_id,academy_id" },
      );
    }
  }
  console.log("   ✓ Instructores verificados");

  // ── Resumen ───────────────────────────────────────────────────────────────
  const { count } = await supabase
    .from("practitioners")
    .select("id", { count: "exact", head: true });

  console.log("\n✅  Seed completado!");
  console.log(`   Total practicantes en BD: ${count}`);
  console.log(`   Academias disponibles:    ${academyIds.length}`);
  console.log("\n   Ejecuta: pnpm dev  y visita /admin/practitioners\n");
}

main().catch((err) => {
  console.error("\n❌  Error:", err.message);
  process.exit(1);
});
