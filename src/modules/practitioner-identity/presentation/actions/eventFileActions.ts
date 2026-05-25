"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "event-files";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

interface UploadResult {
  path: string;
  name: string;
  size: number;
  type: string;
}

/**
 * Verifica si el usuario es admin
 */
async function requireAdmin(): Promise<{ userId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await adminSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return { userId: user.id };
}

/**
 * Sube una imagen de portada para un evento
 */
export async function uploadEventCoverAction(
  eventId: string,
  fileData: {
    name: string;
    type: string;
    size: number;
    base64: string;
  },
): Promise<ActionResult<UploadResult>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado" };
  }

  try {
    // Convertir base64 a buffer
    const base64Data = fileData.base64.split(",")[1];
    if (!base64Data) {
      return {
        success: false,
        error: "Formato de imagen inválido",
      };
    }
    const buffer = Buffer.from(base64Data, "base64");

    const ext = fileData.name.split(".").pop() ?? "jpg";
    const filename = `cover_${Date.now()}.${ext}`;
    const storagePath = `events/${eventId}/cover/${filename}`;

    const { error } = await adminSupabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: fileData.type,
        upsert: true,
      });

    if (error) {
      console.error("[uploadEventCoverAction]", error);
      return {
        success: false,
        error: `Error al subir imagen: ${error.message}`,
      };
    }

    return {
      success: true,
      data: {
        path: storagePath,
        name: fileData.name,
        size: fileData.size,
        type: fileData.type,
      },
    };
  } catch (err) {
    console.error("[uploadEventCoverAction]", err);
    return {
      success: false,
      error: "Error al procesar la imagen",
    };
  }
}

/**
 * Sube un archivo adjunto para un evento
 */
export async function uploadEventAttachmentAction(
  eventId: string,
  fileData: {
    name: string;
    type: string;
    size: number;
    base64: string;
  },
): Promise<ActionResult<UploadResult>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado" };
  }

  try {
    // Convertir base64 a buffer
    const base64Data = fileData.base64.split(",")[1];
    if (!base64Data) {
      return {
        success: false,
        error: "Formato de archivo inválido",
      };
    }
    const buffer = Buffer.from(base64Data, "base64");

    const safeName = fileData.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `events/${eventId}/attachments/${Date.now()}_${safeName}`;

    const { error } = await adminSupabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: fileData.type,
        upsert: false,
      });

    if (error) {
      console.error("[uploadEventAttachmentAction]", error);
      return {
        success: false,
        error: `Error al subir archivo: ${error.message}`,
      };
    }

    return {
      success: true,
      data: {
        path: storagePath,
        name: fileData.name,
        size: fileData.size,
        type: fileData.type,
      },
    };
  } catch (err) {
    console.error("[uploadEventAttachmentAction]", err);
    return {
      success: false,
      error: "Error al procesar el archivo",
    };
  }
}

/**
 * Elimina un archivo del storage de eventos
 */
export async function deleteEventFileAction(
  storagePath: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado" };
  }

  const { error } = await adminSupabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error("[deleteEventFileAction]", error);
    return {
      success: false,
      error: `Error al eliminar archivo: ${error.message}`,
    };
  }

  return { success: true };
}
