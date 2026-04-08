/**
 * Crea los auth users en Supabase (ejecutar solo una vez).
 * Si el usuario ya existe, lo omite sin error.
 *
 * Usage: pnpm seed:users
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌  Missing env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "Kombat2025!";

const EMAILS = [
  "admin@kombat.cl",
  "maestro@kombat.cl",
  "profesor@kombat.cl",
  "instructor@kombat.cl",
  "alumno.adulto@kombat.cl",
  "alumno.juvenil@kombat.cl",
  "alumno.inactivo@kombat.cl",
];

async function main() {
  console.log("👤  Creando auth users...\n");

  for (const email of EMAILS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });

    if (!error) {
      console.log(`   ✓ Creado: ${email}  (${data.user.id})`);
    } else if (
      error.message.includes("already been registered") ||
      error.message.includes("already exists")
    ) {
      console.log(`   ⏭  Ya existe: ${email}`);
    } else {
      console.error(`   ❌  Error en ${email}: ${error.message}`);
    }
  }

  console.log("\n✅  Listo. Ahora ejecuta: pnpm seed");
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
