/**
 * seed-full-data.ts
 *
 * Genera datos de prueba completos para kombat-id:
 *   - 100 academias distribuidas en las regiones de Chile
 *   - 1 instructor por academia (con cuenta auth.users + practitioner + user_roles)
 *   - 20 alumnos por academia (con cuenta auth.users + practitioner + user_roles)
 *   - academy_memberships para instructores y alumnos
 *   - discipline_grades (1 disciplina por alumno)
 *
 * Prerrequisitos:
 *   - .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 *   - Al menos un registro en admin_users (para usar como created_by)
 *   - Rol "instructor" y "alumno" presentes en la tabla roles
 *
 * Ejecución:
 *   pnpm tsx scripts/seed-full-data.ts
 *
 * Contraseña para todos los usuarios creados: Kombat2026
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌  Faltan variables de entorno. Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "Kombat2026";
const STUDENTS_PER_ACADEMY = 20;
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

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
  "Taekwondo WTF",
  "Marcial",
  "Hapkido",
  "Kick Boxing",
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
  "Lucía",
  "Macarena",
  "María",
  "Martina",
  "Natalia",
  "Nicole",
  "Paula",
  "Sofía",
  "Valentina",
  "Valeria",
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
  "Lagos",
  "López",
  "Martínez",
  "Medina",
  "Mendoza",
  "Miranda",
  "Molina",
  "Morales",
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

// Grados por disciplina
type Discipline =
  | "kombat_taekwondo"
  | "taekwondo_wtf"
  | "hapkido"
  | "kick_boxing"
  | "defensa_personal";

const DISCIPLINES: Discipline[] = [
  "kombat_taekwondo",
  "taekwondo_wtf",
  "hapkido",
  "kick_boxing",
  "defensa_personal",
];

// Grados comunes a todas las disciplinas (los más frecuentes del proyecto)
const GRADES_BY_DISCIPLINE: Record<
  Discipline,
  { grades: string[]; weights: number[] }
> = {
  kombat_taekwondo: {
    grades: ["white", "yellow", "green", "blue", "red", "black"],
    weights: [30, 25, 20, 12, 8, 5],
  },
  taekwondo_wtf: {
    grades: ["white", "yellow", "green", "blue", "red", "black"],
    weights: [30, 25, 20, 12, 8, 5],
  },
  hapkido: {
    grades: ["white", "yellow", "green", "blue", "red", "black"],
    weights: [30, 25, 20, 12, 8, 5],
  },
  kick_boxing: {
    grades: ["white", "yellow", "green", "blue", "red", "black"],
    weights: [30, 25, 20, 12, 8, 5],
  },
  defensa_personal: {
    grades: ["white", "yellow", "green", "blue", "red", "black"],
    weights: [30, 25, 20, 12, 8, 5],
  },
};

// Grados disponibles para instructores (más avanzados)
const INSTRUCTOR_GRADES = ["blue", "red", "black"];
const INSTRUCTOR_GRADE_WEIGHTS = [20, 30, 50];

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

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startYear: number, endYear: number): string {
  const y = randomInt(startYear, endYear);
  const m = randomInt(1, 12);
  const d = randomInt(1, 28);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

/** Genera RUT chileno con dígito verificador */
function generateRut(n: number): string {
  const num = 5_000_000 + n;
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

async function insertBatch<T extends object>(
  table: string,
  rows: T[],
  label: string,
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.warn(
        `   ⚠️  Error en ${label} (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${error.message}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Counters
// ---------------------------------------------------------------------------

let rutCounter = 0;

function nextRut(): string {
  return generateRut(rutCounter++);
}

// ---------------------------------------------------------------------------
// Step helpers
// ---------------------------------------------------------------------------

type CreatedUser = {
  authUserId: string;
  email: string;
  fullName: string;
  rut: string;
  practitionerId: string;
};

/**
 * Crea un usuario en auth.users y su registro en practitioners.
 * Retorna los IDs creados o null si hubo error.
 */
async function createUserAndPractitioner(opts: {
  email: string;
  fullName: string;
  rut: string;
  role: string;
  grade: string;
  dan: number | null;
  birthDate: string;
  startDate: string;
  gender: string;
  discipline: Discipline | null;
  region: string;
  city: string;
}): Promise<CreatedUser | null> {
  // 1. Crear en auth.users
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: opts.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: opts.fullName },
    });

  if (authError) {
    // Si el usuario ya existe, intentar obtenerlo
    if (
      authError.message.includes("already") ||
      authError.message.includes("exists")
    ) {
      console.warn(`   ⚠️  Usuario ya existe: ${opts.email} — omitido`);
    } else {
      console.warn(
        `   ⚠️  Error creando auth user ${opts.email}: ${authError.message}`,
      );
    }
    return null;
  }

  const authUserId = authData.user.id;

  // 2. Crear en practitioners
  const { data: practData, error: practError } = await supabase
    .from("practitioners")
    .insert({
      auth_user_id: authUserId,
      full_name: opts.fullName,
      rut: opts.rut,
      role: opts.role,
      grade: opts.grade,
      dan: opts.dan,
      birth_date: opts.birthDate,
      start_date: opts.startDate,
      gender: opts.gender,
      martial_art: opts.discipline ?? undefined,
      is_active: true,
      address_region: opts.region,
      address_city: opts.city,
      address_street: `${pick(STREETS)} ${randomInt(100, 9999)}`,
      contact_email: opts.email,
      weight_kg: randomInt(50, 100),
      height_cm: randomInt(155, 190),
      qr_token: crypto.randomUUID(),
    })
    .select("id")
    .single();

  if (practError || !practData) {
    console.warn(
      `   ⚠️  Error creando practitioner para ${opts.email}: ${practError?.message}`,
    );
    // Limpiar auth user huérfano
    await supabase.auth.admin.deleteUser(authUserId);
    return null;
  }

  return {
    authUserId,
    email: opts.email,
    fullName: opts.fullName,
    rut: opts.rut,
    practitionerId: practData.id as string,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱  Iniciando seed completo de kombat-id...\n");
  console.log(`   Academias: 100`);
  console.log(`   Instructores: 100 (1 por academia)`);
  console.log(
    `   Alumnos: ${100 * STUDENTS_PER_ACADEMY} (${STUDENTS_PER_ACADEMY} por academia)`,
  );
  console.log(`   Contraseña: ${PASSWORD}\n`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ── Obtener admin para created_by ─────────────────────────────────────────
  const { data: admins } = await supabase
    .from("admin_users")
    .select("user_id")
    .limit(1);

  if (!admins?.length) {
    console.error(
      "❌  No se encontró ningún admin en admin_users.\n" +
        "    Ejecuta primero el script de creación de admin.",
    );
    process.exit(1);
  }

  const adminId = admins[0]!.user_id as string;
  console.log(`✓ Admin ID encontrado: ${adminId}\n`);

  // ── Verificar roles disponibles ───────────────────────────────────────────
  const { data: rolesData } = await supabase
    .from("roles")
    .select("name")
    .in("name", ["instructor", "alumno"]);

  const availableRoles = (rolesData ?? []).map((r: { name: string }) => r.name);
  const instructorRoleName = availableRoles.includes("instructor")
    ? "instructor"
    : "profesor";
  const studentRoleName = availableRoles.includes("alumno")
    ? "alumno"
    : "student";

  console.log(
    `✓ Roles encontrados → instructor: "${instructorRoleName}", alumno: "${studentRoleName}"\n`,
  );

  // ── FASE 1: Crear instructores ────────────────────────────────────────────
  console.log("👨‍🏫  FASE 1: Creando 100 instructores...\n");

  const instructors: CreatedUser[] = [];
  let instrNumber = 1;

  for (const regionDef of REGION_DISTRIBUTION) {
    for (let i = 0; i < regionDef.count; i++) {
      const gender = Math.random() < 0.7 ? "male" : "female";
      const firstName =
        gender === "male" ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
      const lastName1 = pick(LAST_NAMES);
      const lastName2 = pick(LAST_NAMES);
      const fullName = `${firstName} ${lastName1} ${lastName2}`;

      const emailSlug = slugify(`${firstName}.${lastName1}`);
      const email = `instructor${String(instrNumber).padStart(3, "0")}.${emailSlug}@kombat-seed.cl`;

      const grade = pickWeighted(INSTRUCTOR_GRADES, INSTRUCTOR_GRADE_WEIGHTS);
      const dan = grade === "black" ? randomInt(1, 5) : null;

      const birthYear = randomInt(1975, 1995);
      const startYear = randomInt(1995, 2015);
      const city = pick(regionDef.cities);

      const result = await createUserAndPractitioner({
        email,
        fullName,
        rut: nextRut(),
        role: instructorRoleName,
        grade,
        dan,
        birthDate: randomDate(birthYear, birthYear),
        startDate: randomDate(startYear, startYear),
        gender,
        discipline: pick(DISCIPLINES),
        region: regionDef.region,
        city,
      });

      if (result) {
        instructors.push(result);
      }

      process.stdout.write(
        `\r   Instructores creados: ${instructors.length}/100`,
      );
      instrNumber++;
    }
  }

  console.log(`\n   ✓ ${instructors.length} instructores creados\n`);

  // Asignar rol "instructor" en user_roles para cada uno
  console.log("   Asignando roles en user_roles...");
  const instrUserRoles = instructors.map((inst) => ({
    user_id: inst.authUserId,
    role_name: instructorRoleName,
    granted_by: adminId,
  }));
  await insertBatch("user_roles", instrUserRoles, "user_roles instructores");
  console.log(`   ✓ ${instrUserRoles.length} registros en user_roles\n`);

  // ── FASE 2: Crear academias ───────────────────────────────────────────────
  console.log("🏫  FASE 2: Creando 100 academias...\n");

  type AcademyRecord = {
    id: string;
    instructorId: string;
    region: string;
    city: string;
  };
  const academies: AcademyRecord[] = [];
  let instrIdx = 0;
  let academyNumber = 1;

  for (const regionDef of REGION_DISTRIBUTION) {
    for (let i = 0; i < regionDef.count; i++) {
      const instructor = instructors[instrIdx];
      instrIdx++;

      if (!instructor) continue;

      const city = pick(regionDef.cities);
      const prefix = pick(ACADEMY_NAME_PREFIXES);
      const suffix = pick(ACADEMY_NAME_SUFFIXES);
      const name =
        `${prefix} ${suffix} ${city} ${academyNumber > 1 ? academyNumber : ""}`.trim();

      const { data: acad, error: acadError } = await supabase
        .from("academies")
        .insert({
          name,
          region: regionDef.region,
          city,
          address: `${pick(STREETS)} ${randomInt(100, 9999)}`,
          founded_date: randomDate(1990, 2022),
          is_active: true,
          responsible_instructor_ids: [instructor.practitionerId],
          created_by: adminId,
          contact_email: `academia${String(academyNumber).padStart(3, "0")}@kombat-seed.cl`,
          contact_phone: `+569${randomInt(10000000, 99999999)}`,
          description: `Academia de artes marciales ${suffix} ubicada en ${city}.`,
        })
        .select("id")
        .single();

      if (acadError || !acad) {
        console.warn(
          `   ⚠️  Error creando academia "${name}": ${acadError?.message}`,
        );
      } else {
        academies.push({
          id: acad.id as string,
          instructorId: instructor.practitionerId,
          region: regionDef.region,
          city,
        });
      }

      process.stdout.write(`\r   Academias creadas: ${academies.length}/100`);
      academyNumber++;
    }
  }

  console.log(`\n   ✓ ${academies.length} academias creadas\n`);

  // Crear membresías de instructores en sus academias
  console.log("   Creando membresías de instructores...");
  const instrMemberships = academies.map((a) => ({
    practitioner_id: a.instructorId,
    academy_id: a.id,
    is_active: true,
    joined_at: new Date().toISOString(),
  }));
  await insertBatch(
    "academy_memberships",
    instrMemberships,
    "membresías instructores",
  );
  console.log(`   ✓ ${instrMemberships.length} membresías de instructores\n`);

  // ── FASE 3: Crear alumnos ─────────────────────────────────────────────────
  console.log(
    `🥋  FASE 3: Creando ${academies.length * STUDENTS_PER_ACADEMY} alumnos (${STUDENTS_PER_ACADEMY} por academia)...\n`,
  );

  let totalStudentsCreated = 0;
  let studentNumber = 1;

  // Para las discipline_grades los acumulamos para insertar al final
  type DisciplineGradeInsert = {
    practitioner_id: string;
    discipline: string;
    grade: string;
    dan: number | null;
    obtained_at: string;
    is_active: boolean;
  };
  const disciplineGradesQueue: DisciplineGradeInsert[] = [];

  for (let ai = 0; ai < academies.length; ai++) {
    const academy = academies[ai]!;

    // Crear alumnos en este batch del loop pero insertar en sub-batches
    const studentsForAcademy: CreatedUser[] = [];

    for (let s = 0; s < STUDENTS_PER_ACADEMY; s++) {
      const gender = Math.random() < 0.55 ? "male" : "female";
      const firstName =
        gender === "male" ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
      const lastName1 = pick(LAST_NAMES);
      const lastName2 = pick(LAST_NAMES);
      const fullName = `${firstName} ${lastName1} ${lastName2}`;

      const emailSlug = slugify(`${firstName}.${lastName1}`);
      const email = `alumno${String(studentNumber).padStart(4, "0")}.${emailSlug}@kombat-seed.cl`;

      // Disciplina y grado del alumno
      const discipline = pick(DISCIPLINES);
      const gradeConfig = GRADES_BY_DISCIPLINE[discipline];
      const grade = pickWeighted(gradeConfig.grades, gradeConfig.weights);
      const dan = grade === "black" ? randomInt(1, 3) : null;

      // Edades variadas: infantil, juvenil, adulto, senior
      const ageGroup = Math.random();
      let birthYear: number;
      if (ageGroup < 0.15)
        birthYear = randomInt(2010, 2015); // infantil
      else if (ageGroup < 0.3)
        birthYear = randomInt(2005, 2009); // juvenil
      else if (ageGroup < 0.85)
        birthYear = randomInt(1985, 2004); // adulto
      else birthYear = randomInt(1960, 1984); // senior

      const startYear = Math.max(birthYear + 7, 2005);

      const result = await createUserAndPractitioner({
        email,
        fullName,
        rut: nextRut(),
        role: studentRoleName,
        grade,
        dan,
        birthDate: randomDate(birthYear, birthYear),
        startDate: randomDate(startYear, 2024),
        gender,
        discipline,
        region: academy.region,
        city: academy.city,
      });

      if (result) {
        studentsForAcademy.push(result);

        // Encolar discipline_grade para este alumno
        disciplineGradesQueue.push({
          practitioner_id: result.practitionerId,
          discipline,
          grade,
          dan,
          obtained_at: randomDate(startYear, 2024),
          is_active: true,
        });
      }

      studentNumber++;
    }

    // Membresías de los alumnos de esta academia
    if (studentsForAcademy.length > 0) {
      const studentMemberships = studentsForAcademy.map((s) => ({
        practitioner_id: s.practitionerId,
        academy_id: academy.id,
        is_active: true,
        joined_at: new Date().toISOString(),
      }));
      await insertBatch(
        "academy_memberships",
        studentMemberships,
        `membresías alumnos academia ${ai + 1}`,
      );

      // Asignar rol "alumno" en user_roles
      const studentUserRoles = studentsForAcademy.map((s) => ({
        user_id: s.authUserId,
        role_name: studentRoleName,
        granted_by: adminId,
      }));
      await insertBatch(
        "user_roles",
        studentUserRoles,
        `user_roles alumnos academia ${ai + 1}`,
      );
    }

    totalStudentsCreated += studentsForAcademy.length;
    process.stdout.write(
      `\r   Academia ${ai + 1}/${academies.length} — alumnos: ${totalStudentsCreated}`,
    );
  }

  console.log(`\n   ✓ ${totalStudentsCreated} alumnos creados\n`);

  // ── FASE 4: Discipline grades ─────────────────────────────────────────────
  console.log(
    `📊  FASE 4: Insertando ${disciplineGradesQueue.length} registros de discipline_grades...\n`,
  );

  await insertBatch(
    "discipline_grades",
    disciplineGradesQueue,
    "discipline_grades",
  );
  console.log(
    `   ✓ ${disciplineGradesQueue.length} discipline_grades creados\n`,
  );

  // ── Resumen final ─────────────────────────────────────────────────────────
  const [acadCount, practCount, memberCount, gradeCount] = await Promise.all([
    supabase.from("academies").select("id", { count: "exact", head: true }),
    supabase.from("practitioners").select("id", { count: "exact", head: true }),
    supabase
      .from("academy_memberships")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("discipline_grades")
      .select("id", { count: "exact", head: true }),
  ]);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅  Seed completado exitosamente!\n");
  console.log("   Resumen de esta ejecución:");
  console.log(`   ├─ Academias creadas:        ${academies.length}`);
  console.log(`   ├─ Instructores creados:     ${instructors.length}`);
  console.log(`   ├─ Alumnos creados:          ${totalStudentsCreated}`);
  console.log(
    `   ├─ Discipline grades:        ${disciplineGradesQueue.length}`,
  );
  console.log("\n   Totales en la base de datos:");
  console.log(`   ├─ Academias:               ${acadCount.count}`);
  console.log(`   ├─ Practitioners:           ${practCount.count}`);
  console.log(`   ├─ Membresías:              ${memberCount.count}`);
  console.log(`   └─ Discipline grades:       ${gradeCount.count}`);
  console.log("\n   Credenciales de acceso:");
  console.log("   ├─ Instructores: instructor001.nombre@kombat-seed.cl");
  console.log("   ├─ Alumnos:     alumno0001.nombre@kombat-seed.cl");
  console.log(`   └─ Contraseña:  ${PASSWORD}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err: Error) => {
  console.error("\n❌  Error fatal:", err.message);
  process.exit(1);
});
