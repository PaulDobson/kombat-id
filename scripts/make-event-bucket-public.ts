import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Variables de entorno faltantes en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function makeEventBucketPublic() {
  console.log("🔧 Haciendo bucket 'event-files' público...\n");

  // Verificar bucket actual
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucket = buckets?.find((b) => b.name === "event-files");

  if (!bucket) {
    console.log("❌ Bucket 'event-files' no encontrado");
    return;
  }

  console.log(`📦 Bucket actual:`);
  console.log(`   - Nombre: ${bucket.name}`);
  console.log(`   - Público: ${bucket.public ? "Sí" : "No"}`);

  if (bucket.public) {
    console.log("\n✅ El bucket ya es público, no se requieren cambios");
    return;
  }

  // Actualizar bucket para hacerlo público
  const { data, error } = await supabase.storage.updateBucket("event-files", {
    public: true,
  });

  if (error) {
    console.log(`\n❌ Error actualizando bucket: ${error.message}`);
    return;
  }

  console.log("\n✅ Bucket actualizado correctamente");
  console.log("   El bucket 'event-files' ahora es público");

  // Verificar que funcionó
  console.log("\n🔍 Verificando cambios...\n");

  const { data: updatedBuckets } = await supabase.storage.listBuckets();
  const updatedBucket = updatedBuckets?.find((b) => b.name === "event-files");

  if (updatedBucket?.public) {
    console.log("✅ Verificación exitosa: el bucket es ahora público");

    // Probar una imagen
    const { data: events } = await supabase
      .from("martial_events")
      .select("cover_image_path")
      .not("cover_image_path", "is", null)
      .limit(1);

    const firstEvent = events?.[0];
    if (firstEvent?.cover_image_path) {
      const { data: urlData } = supabase.storage
        .from("event-files")
        .getPublicUrl(firstEvent.cover_image_path);

      console.log(`\n🧪 Probando URL: ${urlData.publicUrl}`);

      try {
        const response = await fetch(urlData.publicUrl);
        if (response.ok) {
          console.log("✅ La imagen es ahora accesible públicamente");
        } else {
          console.log(`⚠️  Estado HTTP: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error}`);
      }
    }
  } else {
    console.log("❌ El bucket sigue sin ser público");
  }
}

makeEventBucketPublic().catch(console.error);
