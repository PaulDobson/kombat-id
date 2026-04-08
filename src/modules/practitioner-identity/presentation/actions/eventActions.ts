"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import type { EventType } from "@/types/database.types";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

export interface MartialEvent {
  id: string;
  name: string;
  event_type: EventType;
  event_date: string;
  location: string | null;
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

const CreateEventSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200).trim(),
  event_type: z.enum(["competition", "seminar", "exam"]),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  location: z.string().max(300).trim().optional(),
});

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
