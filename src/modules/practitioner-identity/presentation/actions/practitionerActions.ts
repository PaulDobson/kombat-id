"use server";

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import { DrizzlePractitionerRepository } from "../../infrastructure/repositories/drizzlePractitionerRepository";
import {
  registerPractitioner,
  RegisterPractitionerInputSchema,
} from "../../application/use-cases/registerPractitioner";
import {
  updateContactInfo,
  UpdateContactInfoInputSchema,
} from "../../application/use-cases/updateContactInfo";
import {
  updateProfilePhoto,
  UpdateProfilePhotoInputSchema,
  type StoragePort,
} from "../../application/use-cases/updateProfilePhoto";
import {
  DuplicateRutError,
  PractitionerNotFoundError,
  PractitionerInactiveError,
} from "../../domain/errors";
import { z } from "zod";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function registerPractitionerAction(
  rawInput: unknown,
): Promise<ActionResult<{ publicId: string }>> {
  const user = await getSession();
  if (!user) {
    return { success: false, error: "No autenticado", code: "UNAUTHORIZED" };
  }

  const parsed = RegisterPractitionerInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const practitionerRepo = new DrizzlePractitionerRepository();
    const result = await registerPractitioner(parsed.data, {
      practitionerRepo,
    });
    return { success: true, data: { publicId: result.publicId } };
  } catch (err) {
    if (err instanceof DuplicateRutError) {
      return {
        success: false,
        error: "Ya existe un practicante con ese RUT",
        code: "DUPLICATE_RUT",
      };
    }
    console.error("[registerPractitionerAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function updateContactInfoAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, error: "No autenticado", code: "UNAUTHORIZED" };
  }

  const parsed = UpdateContactInfoInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const practitionerRepo = new DrizzlePractitionerRepository();
    await updateContactInfo(parsed.data, { practitionerRepo });
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof PractitionerNotFoundError) {
      return {
        success: false,
        error: "Practicante no encontrado",
        code: "NOT_FOUND",
      };
    }
    if (err instanceof PractitionerInactiveError) {
      return {
        success: false,
        error: "El perfil está inactivo y no puede ser modificado",
        code: "INACTIVE",
      };
    }
    console.error("[updateContactInfoAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function updateProfilePhotoAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, error: "No autenticado", code: "UNAUTHORIZED" };
  }

  const parsed = UpdateProfilePhotoInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Archivo inválido: solo se aceptan JPEG o PNG de hasta 5 MB",
      code: "INVALID_FILE",
    };
  }

  const storage: StoragePort = {
    async upload(path: string, file: Blob, mimeType: string): Promise<string> {
      const { error } = await adminSupabase.storage
        .from("profile-photos")
        .upload(path, file, { contentType: mimeType, upsert: true });
      if (error) {
        throw new DomainError(`Storage upload failed: ${error.message}`);
      }
      return path;
    },
  };

  try {
    const practitionerRepo = new DrizzlePractitionerRepository();
    await updateProfilePhoto(parsed.data, { practitionerRepo, storage });
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof PractitionerNotFoundError) {
      return {
        success: false,
        error: "Practicante no encontrado",
        code: "NOT_FOUND",
      };
    }
    if (err instanceof PractitionerInactiveError) {
      return {
        success: false,
        error: "El perfil está inactivo y no puede ser modificado",
        code: "INACTIVE",
      };
    }
    if (err instanceof z.ZodError) {
      return {
        success: false,
        error: "Archivo inválido: solo se aceptan JPEG o PNG de hasta 5 MB",
        code: "INVALID_FILE",
      };
    }
    console.error("[updateProfilePhotoAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}
