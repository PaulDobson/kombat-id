/**
 * seed-academies.ts
 *
 * Genera 100 academias distribuidas en todas las regiones de Chile,
 * con una media de 20 alumnos activos cada una (distribución Poisson ~20).
 *
 * NO elimina datos existentes — solo inserta nuevos registros.
 *
 * Usage:
 *   pnpm tsx scripts/seed-academies.ts
 *
 * Requisitos:
 *   - .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 *   - Al menos un admin en admin_users (para usar como created_by)
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

/** Distribución de academias por región (total = 100) */
const REGION_DISTRIBUTION: Array<{
  region: string;
  count: number;
  cities: string[];
}> = [
  {
    region: "metropolitana",
    count: 28,
    cities: [
      "Santiago",
      "Maipú",
      "La Florida",
      "Puente Alto",
      "Las Condes",
      "Ñuñoa",
      "Providencia",
      "San Bernardo",
      "Peñalolén",
      "Quilicura",
    ],
  },
  {
    region: "valparaiso",
    count: 12,
    cities: [
      "Valparaíso",
      "Viña del Mar",
      "Quilpué",
      "Villa Alemana",
      "San Antonio",
      "Los Andes",
    ],
  },
  {
    region: "biobio",
    count: 10,
    cities: ["Concepción", "Talcahuano", "Los Ángeles", "Chillán", "Coronel"],
  },
  {
    region: "araucania",
    count: 7,
    cities: ["Temuco", "Villarrica", "Pucón", "Angol", "Victoria"],
  },
  {
    region: "maule",
    count: 7,
    cities: ["Talca", "Curicó", "Linares", "Constitución", "Cauquenes"],
  },
  {
    region: "coquimbo",
    count: 6,
    cities: ["La Serena", "Coquimbo", "Ovalle", "Illapel"],
  },
  {
    region: "ohiggins",
    count: 6,
    cities: ["Rancagua", "San Fernando", "Pichilemu", "Rengo"],
  },
  {
    region: "los_lagos",
    count: 5,
    cities: ["Puerto Montt", "Osorno", "Castro", "Ancud"],
  },
  {
    region: "antofagasta",
    count: 4,
    cities: ["Antofagasta", "Calama", "Tocopilla"],
  },
  {
    region: "tarapaca",
    count: 3,
    cities: ["Iquique", "Alto Hospicio"],
  },
  {
    region: "atacama",
    count: 3,
    cities: ["Copiapó", "Vallenar", "Chañaral"],
  },
  {
    region: "nuble",
    count: 2,
    cities: ["Chillán", "San Carlos"],
  },
  {
    region: "los_rios",
    count: 2,
    cities: ["Valdivia", "La Unión"],
  },
  {
    region: "arica_y_parinacota",
    count: 2,
    cities: ["Arica", "Putre"],
  },
  {
    region: "aysen",
    count: 2,
    cities: ["Coyhaique", "Puerto Aysén"],
  },
  {
    region: "magallanes",
    count: 1,
    cities: ["Punta Arenas"],
  },
];

const ACADEMY_NAME_PREFIXES = [
  "Academia",
  "Club",
  "Escuela",
  "Dojo",
  "Centro Deportivo",
  "Instituto",
];

const ACADEMY_NAME_SUFFIXES = [
  "Kombat Taekwondo",
  "KT",
  "Taekwondo",
  "TKD",
  "Artes Marciales",
  "Taekwondo ITF",
  "Taekwondo WTF",
  "Marcial",
];

const STREETS = [
  "Av. Libertador Bernardo O'Higgins",
  "Calle Los Aromos",
  "Av. Principal",
  "Av. Los Leones",
  "Calle San Martín",
  "Av. Providencia",
  "Av. Independencia",
  "Calle O'Higgins",
  "Av. Balmaceda",
  "Pasaje Las Flores",
  "Av. Arturo Prat",
  "Calle Colón",
  "Av. Manuel Montt",
  "Calle Serrano",
  "Av. Vicuña Mackenna",
];

const LAST_NAMES = [
  "González",
  "Muñoz",
  "Rojas",
  "Díaz",
  "Pérez",
  "Soto",
  "Contreras",
  "Silva",
  "Martínez",
  "Sepúlveda",
  "Morales",
  "Torres",
  "Flores",
  "Miranda",
  "Fuentes",
  "Herrera",
  "Medina",
  "Aguilera",
  "Gutiérrez",
  "Espinoza",
];

const FIRST_NAMES_M = [
  "Carlos",
  "Juan",
  "Pedro",
  "Luis",
  "Jorge",
  "Rodrigo",
  "Felipe",
  "Andrés",
  "Diego",
  "Sebastián",
  "Cristóbal",
  "Matías",
  "Nicolás",
  "Pablo",
  "Ricardo",
];

const FIRST_NAMES_F = [
  "María",
  "Ana",
  "Camila",
  "Valentina",
  "Sofía",
  "Fernanda",
  "Catalina",
  "Javiera",
  "Daniela",
  "Carolina",
  "Constanza",
  "Isidora",
  "Martina",
  "Natalia",
  "Paula",
];

const GRADES = ["white", "yellow", "green", "blue", "red", "black"] as const;
const GRADE_WEIGHTS = [30, 25, 20, 12, 8, 5];

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

/** Aproxima distribución de Poisson con media λ usando el método de Knuth */
function poissonSample(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return Math.max(1, k - 1); // mínimo 1 alumno
}

/** Genera un RUT chileno con dígito verificador */
function generateRut(n: number): string {
  const num = 20_000_000 + n;
  const digits = String(num).split("").reverse().map(Number);
  const factors = [2, 3, 4, 5, 6, 7];
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += (digits[i] ?? 0) * (factors[i % factors.length] ?? 2);
  }
  const remainder = 11 - (sum % 11);
  const dv =
    remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return `${num}-${dv}`;
}

let rutCounter = 0;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱  Iniciando seed de 100 academias con ~20 alumnos c/u...\n");

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
  console.log(`✓ Admin ID: ${adminId}\n`);

  // ── Crear academias por región ────────────────────────────────────────────
  console.log("🏫  Creando 100 academias...");

  const allAcademyIds: string[] = [];
  let academyNumber = 1;

  for (const regionDef of REGION_DISTRIBUTION) {
    for (let i = 0; i < regionDef.count; i++) {
      const city = pick(regionDef.cities);
      const prefix = pick(ACADEMY_NAME_PREFIXES);
      const suffix = pick(ACADEMY_NAME_SUFFIXES);
      const name =
        `${prefix} ${suffix} ${city} ${i > 0 ? String(academyNumber) : ""}`.trim();
      const isActive = Math.random() > 0.1; // ~10% inactivas

      const { data, error } = await supabase
        .from("academies")
        .insert({
          name,
          region: regionDef.region,
          city,
          address: `${pick(STREETS)} ${randomInt(100, 9999)}`,
          founded_date: randomDate(1990, 2022),
          is_active: isActive,
          responsible_instructor_ids: [],
          created_by: adminId,
        })
        .select("id")
        .single();

      if (error) {
        console.warn(
          `   ⚠️  Error creando academia "${name}": ${error.message}`,
        );
      } else {
        allAcademyIds.push(data.id as string);
        process.stdout.write(`\r   Creadas: ${allAcademyIds.length}/100`);
      }

      academyNumber++;
    }
  }

  console.log(`\n   ✓ ${allAcademyIds.length} academias creadas`);

  // ── Crear alumnos y membresías por academia ───────────────────────────────
  console.log(
    "\n🥋  Generando alumnos (~20 por academia, distribución Poisson)...",
  );

  let totalPractitioners = 0;
  let totalMemberships = 0;
  const BATCH_SIZE = 50;

  for (let ai = 0; ai < allAcademyIds.length; ai++) {
    const academyId = allAcademyIds[ai];
    const numStudents = poissonSample(20);

    const practitioners: Array<Record<string, unknown>> = [];

    for (let s = 0; s < numStudents; s++) {
      const gender = Math.random() < 0.6 ? "male" : "female";
      const firstName =
        gender === "male" ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
      const lastName1 = pick(LAST_NAMES);
      const lastName2 = pick(LAST_NAMES);

      const grade = pickWeighted([...GRADES], GRADE_WEIGHTS);
      const dan = grade === "black" ? randomInt(1, 4) : null;

      const ageGroup = Math.random();
      let birthYear: number;
      if (ageGroup < 0.2) birthYear = randomInt(2008, 2014);
      else if (ageGroup < 0.4) birthYear = randomInt(2005, 2007);
      else if (ageGroup < 0.85) birthYear = randomInt(1985, 2004);
      else birthYear = randomInt(1960, 1984);

      const startYear = Math.max(birthYear + 6, 2000);
      const isActive = Math.random() > 0.05;

      practitioners.push({
        id: crypto.randomUUID(),
        qr_token: crypto.randomUUID(),
        rut: generateRut(rutCounter++),
        full_name: `${firstName} ${lastName1} ${lastName2}`,
        birth_date: randomDate(birthYear, birthYear),
        gender,
        grade,
        dan,
        start_date: randomDate(startYear, 2024),
        is_active: isActive,
        weight_kg: randomInt(40, 110),
        role: "alumno",
        contact_email: null,
        contact_phone: null,
        auth_user_id: null,
        deactivated_at: isActive ? null : new Date().toISOString(),
        deactivation_reason: isActive ? null : "Retiro voluntario",
      });
    }

    // Insert practitioners in batches
    const insertedIds: string[] = [];
    for (let b = 0; b < practitioners.length; b += BATCH_SIZE) {
      const batch = practitioners.slice(b, b + BATCH_SIZE);
      const { data: inserted, error } = await supabase
        .from("practitioners")
        .insert(batch)
        .select("id");
      if (error) {
        console.warn(
          `\n   ⚠️  Error en practicantes (academia ${ai + 1}): ${error.message}`,
        );
      } else {
        for (const p of inserted ?? []) insertedIds.push(p.id as string);
      }
    }

    // Create memberships for active practitioners
    const memberships = insertedIds.map((pid) => ({
      practitioner_id: pid,
      academy_id: academyId,
      is_active: true,
      joined_at: new Date().toISOString(),
    }));

    if (memberships.length > 0) {
      for (let b = 0; b < memberships.length; b += BATCH_SIZE) {
        const batch = memberships.slice(b, b + BATCH_SIZE);
        const { error } = await supabase
          .from("academy_memberships")
          .insert(batch);
        if (error) {
          console.warn(
            `\n   ⚠️  Error en membresías (academia ${ai + 1}): ${error.message}`,
          );
        } else {
          totalMemberships += batch.length;
        }
      }
    }

    totalPractitioners += insertedIds.length;
    process.stdout.write(
      `\r   Academia ${ai + 1}/${allAcademyIds.length} — ${totalPractitioners} alumnos creados`,
    );
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  const { count: totalAcademies } = await supabase
    .from("academies")
    .select("id", { count: "exact", head: true });

  const { count: totalPract } = await supabase
    .from("practitioners")
    .select("id", { count: "exact", head: true });

  console.log("\n\n✅  Seed completado!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   Academias creadas:        ${allAcademyIds.length}`);
  console.log(`   Alumnos creados:          ${totalPractitioners}`);
  console.log(`   Membresías creadas:       ${totalMemberships}`);
  console.log(
    `   Media alumnos/academia:   ${(totalMemberships / allAcademyIds.length).toFixed(1)}`,
  );
  console.log(`   Total academias en BD:    ${totalAcademies}`);
  console.log(`   Total practicantes en BD: ${totalPract}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n   Ejecuta: pnpm dev  y visita /admin/academies\n");
}

main().catch((err) => {
  console.error("\n❌  Error:", err.message);
  process.exit(1);
});
