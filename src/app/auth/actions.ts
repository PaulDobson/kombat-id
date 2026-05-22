"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import {
  SignInSchema,
  SignUpSchema,
  ResetPasswordSchema,
  UpdatePasswordSchema,
} from "@/lib/validations/auth";
import type { ActionResult } from "@/types/auth.types";

export async function signInAction(formData: FormData): Promise<ActionResult> {
  const parsed = SignInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { success: false, error: "Correo o contraseña incorrectos" };
  }

  revalidatePath("/", "layout");

  // First-login guard: redirect to forced password change
  if (data.user.user_metadata?.must_change_password === true) {
    redirect("/change-password");
  }

  redirect("/dashboard");
}

export async function signUpAction(
  formData: FormData,
): Promise<ActionResult<string>> {
  const parsed = SignUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return {
      success: false,
      error: "No se pudo crear la cuenta. Intenta nuevamente.",
    };
  }

  revalidatePath("/", "layout");
  return { success: true, data: "Revisa tu correo para confirmar tu cuenta." };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function resetPasswordAction(
  formData: FormData,
): Promise<ActionResult<string>> {
  const parsed = ResetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`,
    },
  );

  if (error) {
    return {
      success: false,
      error: "No se pudo enviar el correo. Intenta nuevamente.",
    };
  }

  return {
    success: true,
    data: "Revisa tu correo para el enlace de recuperación.",
  };
}

export async function updatePasswordAction(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = UpdatePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const supabase = await createClient();

  // Verify the user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: "Sesión no válida. Inicia sesión nuevamente.",
    };
  }

  // Update the password
  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateError) {
    return {
      success: false,
      error: "No se pudo actualizar la contraseña. Intenta nuevamente.",
    };
  }

  // Clear the must_change_password flag via admin client
  await adminSupabase.auth.admin.updateUserById(user.id, {
    user_metadata: { must_change_password: false },
  });

  revalidatePath("/", "layout");

  // Redirect to role-appropriate home
  const role = user.app_metadata?.role as string | undefined;
  const home =
    role === "referee"
      ? "/referee/dashboard"
      : role === "instructor"
        ? "/instructor"
        : "/dashboard";

  redirect(home);
}
