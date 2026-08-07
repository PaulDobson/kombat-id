import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Variables de entorno faltantes en .env.local");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkEventImages() {
  console.log("🔍 Verificando imágenes de eventos...\n");

  const { data: events, error } = await supabase
    .from("martial_events")
    .select("id, name, cover_image_path")
    .order("event_date", { ascending: true });

  if (error) {
    console.error("❌ Error al consultar eventos:", error);
    return;
  }

  if (!events || events.length === 0) {
    console.log("⚠️  No se encontraron eventos en la base de datos");
    return;
  }

  console.log(`📊 Total de eventos: ${events.length}\n`);

  const withImages = events.filter((e) => e.cover_image_path);
  const withoutImages = events.filter((e) => !e.cover_image_path);

  console.log(`✅ Con imagen: ${withImages.length}`);
  console.log(`❌ Sin imagen: ${withoutImages.length}\n`);

  console.log("Eventos sin imagen de portada:\n");
  withoutImages.forEach((event, idx) => {
    console.log(`${idx + 1}. ${event.name}`);
    console.log(`   ID: ${event.id}`);
    console.log(`   cover_image_path: ${event.cover_image_path ?? "null"}\n`);
  });

  if (withImages.length > 0) {
    console.log("\nEventos con imagen:\n");
    withImages.forEach((event) => {
      console.log(`✓ ${event.name}`);
      console.log(`  Path: ${event.cover_image_path}`);

      // Generar URL pública para verificar
      const { data } = supabase.storage
        .from("event-files")
        .getPublicUrl(event.cover_image_path!);

      console.log(`  URL: ${data.publicUrl}\n`);
    });
  }
}

checkEventImages().catch(console.error);
