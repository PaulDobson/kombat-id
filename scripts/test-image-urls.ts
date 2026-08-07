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

async function testImageUrls() {
  console.log("🔍 Probando accesibilidad de imágenes...\n");

  const { data: events } = await supabase
    .from("martial_events")
    .select("id, name, cover_image_path")
    .not("cover_image_path", "is", null)
    .limit(3);

  if (!events || events.length === 0) {
    console.log("⚠️  No hay eventos con imágenes para probar");
    return;
  }

  for (const event of events) {
    console.log(`\n📸 ${event.name}`);
    console.log(`Path: ${event.cover_image_path}`);

    const { data } = supabase.storage
      .from("event-files")
      .getPublicUrl(event.cover_image_path);

    console.log(`URL generada: ${data.publicUrl}`);

    // Intentar descargar la imagen
    try {
      const response = await fetch(data.publicUrl);
      console.log(`Status HTTP: ${response.status} ${response.statusText}`);
      console.log(`Content-Type: ${response.headers.get("content-type")}`);

      if (response.ok) {
        const contentLength = response.headers.get("content-length");
        console.log(
          `✅ Imagen accesible (${contentLength ? `${Math.round(parseInt(contentLength) / 1024)}KB` : "tamaño desconocido"})`,
        );
      } else {
        console.log(`❌ Error: No se puede acceder a la imagen`);
        const text = await response.text();
        console.log(`Respuesta: ${text.slice(0, 200)}`);
      }
    } catch (error) {
      console.log(`❌ Error de red: ${error}`);
    }
  }

  console.log("\n\n🔍 Verificando configuración del bucket...\n");

  // Verificar si el bucket existe y es público
  const { data: buckets, error: bucketsError } =
    await supabase.storage.listBuckets();

  if (bucketsError) {
    console.log(`❌ Error listando buckets: ${bucketsError.message}`);
    return;
  }

  const eventBucket = buckets?.find((b) => b.name === "event-files");

  if (!eventBucket) {
    console.log("❌ Bucket 'event-files' no encontrado");
    return;
  }

  console.log(`✅ Bucket 'event-files' existe`);
  console.log(`   - ID: ${eventBucket.id}`);
  console.log(`   - Público: ${eventBucket.public ? "Sí" : "No"}`);
  console.log(`   - Creado: ${eventBucket.created_at}`);
}

testImageUrls().catch(console.error);
