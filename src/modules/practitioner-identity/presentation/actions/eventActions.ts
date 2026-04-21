"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import type { EventAttachment, EventType } from "@/types/database.types";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

export interface MartialEvent {
  id: string;
  name: string;
  event_type: EventType;
  event_date: string;
  location: string | null;
  description: string | null;
  registration_fee: number | null;
  min_participants: number | null;
  max_participants: number | null;
  cover_image_path: string | null;
  attachments: EventAttachment[];
  created_by: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const CreateEventSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio").max(200).trim(),
    event_type: z.enum(["competition", "seminar", "exam"]),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    location: z.string().max(300).trim().optional(),
    description: z
      .string()
      .max(5000, "La descripción no puede superar los 5000 caracteres")
      .optional(),
    registration_fee: z
      .number()
      .min(0, "El precio no puede ser negativo")
      .nullable()
      .optional(),
    min_participants: z
      .number()
      .int()
      .min(1, "El valor debe ser mayor que cero")
      .nullable()
      .optional(),
    max_participants: z
      .number()
      .int()
      .min(1, "El valor debe ser mayor que cero")
      .nullable()
      .optional(),
    cover_image_path: z.string().optional().nullable(),
    attachments: z
      .array(
        z.object({
          name: z.string(),
          path: z.string(),
          size: z.number(),
          type: z.string(),
        }),
      )
      .optional()
      .default([]),
  })
  .refine(
    (data) => {
      if (data.min_participants != null && data.max_participants != null) {
        return data.max_participants >= data.min_participants;
      }
      return true;
    },
    {
      message: "El máximo de participantes debe ser mayor o igual al mínimo",
      path: ["max_participants"],
    },
  );

const UpdateEventSchema = CreateEventSchema.extend({
  id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createEventAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = CreateEventSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  const { data, error } = await adminSupabase
    .from("martial_events")
    .insert({
      name: parsed.data.name,
      event_type: parsed.data.event_type,
      event_date: parsed.data.event_date,
      location: parsed.data.location ?? null,
      description: parsed.data.description ?? null,
      registration_fee: parsed.data.registration_fee ?? null,
      min_participants: parsed.data.min_participants ?? null,
      max_participants: parsed.data.max_participants ?? null,
      cover_image_path: parsed.data.cover_image_path ?? null,
      attachments: parsed.data.attachments ?? [],
      created_by: admin.userId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createEventAction]", error);
    return {
      success: false,
      error: "Error al crear el evento",
      code: "INTERNAL_ERROR",
    };
  }

  revalidatePath("/admin/events");
  revalidatePath("/");
  return { success: true, data: { id: data.id } };
}

export async function updateEventAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = UpdateEventSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  const { error } = await adminSupabase
    .from("martial_events")
    .update({
      name: parsed.data.name,
      event_type: parsed.data.event_type,
      event_date: parsed.data.event_date,
      location: parsed.data.location ?? null,
      description: parsed.data.description ?? null,
      registration_fee: parsed.data.registration_fee ?? null,
      min_participants: parsed.data.min_participants ?? null,
      max_participants: parsed.data.max_participants ?? null,
      cover_image_path: parsed.data.cover_image_path ?? null,
      attachments: parsed.data.attachments ?? [],
    })
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[updateEventAction]", error);
    return {
      success: false,
      error: "Error al actualizar el evento",
      code: "INTERNAL_ERROR",
    };
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${parsed.data.id}`);
  revalidatePath("/");
  return { success: true, data: undefined };
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: "ID inválido", code: "VALIDATION_ERROR" };
  }

  const { error } = await adminSupabase
    .from("martial_events")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteEventAction]", error);
    return {
      success: false,
      error: "Error al eliminar el evento",
      code: "INTERNAL_ERROR",
    };
  }

  revalidatePath("/admin/events");
  revalidatePath("/");
  return { success: true, data: undefined };
}
