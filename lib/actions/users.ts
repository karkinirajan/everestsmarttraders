"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";

export type PasswordFormState = {
  success: boolean;
  message: string;
};

const passwordSchema = z
  .object({
    user_id: z.string().uuid(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password must be at most 72 characters."),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

/**
 * Update another user's login password. Admin-only: the caller's session
 * is verified against public.profiles before the service-role client
 * touches auth.users. Passwords are stored (hashed) by Supabase Auth —
 * they never live in the profiles table.
 */
export async function updateUserPassword(
  _prevState: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const parsed = passwordSchema.safeParse({
    user_id: formData.get("user_id"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { success: false, message: "Only admins can change passwords." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(parsed.data.user_id, {
    password: parsed.data.password,
  });

  if (error) {
    console.error("Password update error:", error.message);
    return { success: false, message: "Failed to update password." };
  }

  return { success: true, message: "Password updated." };
}
