"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";

/**
 * Generic, authorization-checked CRUD for the admin dashboard.
 *
 * Every write goes through the service-role client, which bypasses Row
 * Level Security entirely — so admin/editor CRUD keeps working whether a
 * table's RLS is enabled, disabled, or missing a policy. Authorization is
 * enforced here in application code instead (session + profiles.role),
 * mirroring the pattern already used in lib/actions/users.ts.
 *
 * Tables are allow-listed so this can't be pointed at arbitrary tables
 * (e.g. profiles, auth-adjacent tables) from the client.
 */
const MUTABLE_TABLES = new Set([
  "products",
  "product_categories",
  "services",
  "industries",
  "projects",
  "blog_posts",
  "testimonials",
  "faqs",
  "site_settings",
  "homepage_sections",
  "announcements",
  "seo_overrides",
  "inquiries",
  "media_assets",
]);

export type MutateResult<T = Record<string, unknown>> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireEditor(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "editor"].includes(profile.role)) {
    return { ok: false, error: "Not authorized." };
  }
  return { ok: true, userId: user.id };
}

function assertTable(table: string): string | null {
  if (!MUTABLE_TABLES.has(table)) return `"${table}" is not a manageable table.`;
  return null;
}

export async function adminInsert<T = Record<string, unknown>>(
  table: string,
  payload: Record<string, unknown>,
): Promise<MutateResult<T>> {
  const tableError = assertTable(table);
  if (tableError) return { success: false, error: tableError };

  const auth = await requireEditor();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(table)
    .insert(payload)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as T };
}

export async function adminUpdate<T = Record<string, unknown>>(
  table: string,
  id: string,
  payload: Record<string, unknown>,
): Promise<MutateResult<T>> {
  const tableError = assertTable(table);
  if (tableError) return { success: false, error: tableError };

  const auth = await requireEditor();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(table)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as T };
}

export async function adminUpsert<T = Record<string, unknown>>(
  table: string,
  payload: Record<string, unknown>,
  conflictColumn: string,
): Promise<MutateResult<T>> {
  const tableError = assertTable(table);
  if (tableError) return { success: false, error: tableError };

  const auth = await requireEditor();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(table)
    .upsert(payload, { onConflict: conflictColumn })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as T };
}

export async function adminDelete(
  table: string,
  id: string,
): Promise<MutateResult<null>> {
  const tableError = assertTable(table);
  if (tableError) return { success: false, error: tableError };

  const auth = await requireEditor();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin.from(table).delete().eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}
