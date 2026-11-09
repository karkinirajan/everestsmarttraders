"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  checkConflictColumn,
  checkTable,
  cleanPayload,
  isUuid,
  publicMessage,
} from "@/lib/admin-rules";

/**
 * Generic, authorization-checked CRUD for the admin dashboard.
 *
 * Every write goes through the service-role client, which bypasses Row
 * Level Security entirely — so admin/editor CRUD keeps working whether a
 * table's RLS is enabled, disabled, or missing a policy. Authorization is
 * enforced here in application code instead (session + profiles.role,
 * lib/auth.ts), mirroring the pattern used in lib/actions/users.ts.
 *
 * The rules (lib/admin-rules.ts): tables are allow-listed so this can't be
 * pointed at arbitrary tables (e.g. profiles) from the client; ids must be
 * UUIDs; an upsert may only be keyed on a known column; the columns the
 * database owns (id, created_at, updated_at) cannot be set from the
 * browser; and an error shows the browser a short sentence, not the
 * database's own text (which is logged).
 *
 * Public pages are statically rendered with no time-based revalidation, so
 * every successful write also busts the root layout's cache — otherwise
 * admin edits would only appear on the site after the next deploy.
 */
export type MutateResult<T = Record<string, unknown>> =
  | { success: true; data: T }
  | { success: false; error: string };

function failed(context: string, error: { code?: string; message?: string }): { success: false; error: string } {
  console.error(`[admin] ${context} failed:`, error.code ?? "", error.message ?? "");
  return { success: false, error: publicMessage(error) };
}

export async function adminInsert<T = Record<string, unknown>>(
  table: string,
  payload: Record<string, unknown>,
): Promise<MutateResult<T>> {
  const tableError = checkTable(table);
  if (tableError) return { success: false, error: tableError };

  const auth = await requireEditor();
  if (!auth.ok) return { success: false, error: auth.error };

  const clean = cleanPayload(payload);
  if (!clean.ok) return { success: false, error: clean.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(table)
    .insert(clean.value)
    .select()
    .single();

  if (error) return failed(`insert into ${table}`, error);
  revalidatePath("/", "layout");
  return { success: true, data: data as T };
}

export async function adminUpdate<T = Record<string, unknown>>(
  table: string,
  id: string,
  payload: Record<string, unknown>,
): Promise<MutateResult<T>> {
  const tableError = checkTable(table);
  if (tableError) return { success: false, error: tableError };
  if (!isUuid(id)) return { success: false, error: "Invalid id." };

  const auth = await requireEditor();
  if (!auth.ok) return { success: false, error: auth.error };

  const clean = cleanPayload(payload);
  if (!clean.ok) return { success: false, error: clean.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(table)
    .update(clean.value)
    .eq("id", id)
    .select()
    .single();

  if (error) return failed(`update ${table}`, error);
  revalidatePath("/", "layout");
  return { success: true, data: data as T };
}

export async function adminUpsert<T = Record<string, unknown>>(
  table: string,
  payload: Record<string, unknown>,
  conflictColumn: string,
): Promise<MutateResult<T>> {
  const tableError = checkTable(table);
  if (tableError) return { success: false, error: tableError };
  const conflictError = checkConflictColumn(table, conflictColumn);
  if (conflictError) return { success: false, error: conflictError };

  const auth = await requireEditor();
  if (!auth.ok) return { success: false, error: auth.error };

  const clean = cleanPayload(payload, [conflictColumn]);
  if (!clean.ok) return { success: false, error: clean.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(table)
    .upsert(clean.value, { onConflict: conflictColumn })
    .select()
    .single();

  if (error) return failed(`upsert ${table}`, error);
  revalidatePath("/", "layout");
  return { success: true, data: data as T };
}

export async function adminDelete(
  table: string,
  id: string,
): Promise<MutateResult<null>> {
  const tableError = checkTable(table);
  if (tableError) return { success: false, error: tableError };
  if (!isUuid(id)) return { success: false, error: "Invalid id." };

  const auth = await requireEditor();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin.from(table).delete().eq("id", id);

  if (error) return failed(`delete from ${table}`, error);
  revalidatePath("/", "layout");
  return { success: true, data: null };
}
