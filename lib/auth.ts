import { createClient } from "@/lib/supabase/server";

export type AuthResult = { ok: true; userId: string; role: "admin" | "editor" } | { ok: false; error: string };

/**
 * Who is calling a server action. A server action is a public POST endpoint, so every one that writes checks the session itself
 * (the proxy and the admin layout only guard pages): the user must be signed in and have the admin or editor role in profiles.
 */
export async function requireEditor(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || (profile.role !== "admin" && profile.role !== "editor")) {
    return { ok: false, error: "Not authorized." };
  }
  return { ok: true, userId: user.id, role: profile.role };
}

export async function requireAdmin(): Promise<AuthResult> {
  const auth = await requireEditor();
  if (!auth.ok) return auth;
  return auth.role === "admin" ? auth : { ok: false, error: "Only admins can do this." };
}
