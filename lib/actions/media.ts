"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import type { MutateResult } from "@/lib/actions/admin-mutate";

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "media";

async function requireEditor(): Promise<
  { ok: true } | { ok: false; error: string }
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
  return { ok: true };
}

interface MediaAsset {
  id: string;
  filename: string;
  url: string;
  storage_path: string;
  mime_type: string | null;
  size: number | null;
  alt: string | null;
  folder: string | null;
  created_at: string;
}

/**
 * Upload a file to Supabase Storage and record it in media_assets.
 * Uses the service-role client for both the storage write and the table
 * insert, so it works regardless of storage/RLS policy state.
 */
export async function adminUploadMedia(
  formData: FormData,
): Promise<MutateResult<MediaAsset>> {
  const auth = await requireEditor();
  if (!auth.ok) return { success: false, error: auth.error };

  const file = formData.get("file");
  const folder = String(formData.get("folder") || "general");
  const alt = (formData.get("alt") as string) || null;

  if (!(file instanceof File)) {
    return { success: false, error: "No file provided." };
  }

  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
  const storagePath = `${folder}/${hash}_${safeName}`;

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("media_assets")
    .select("filename")
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: `This file has already been uploaded as "${existing.filename}". Copy its URL from the library below.`,
    };
  }

  const { error: storageErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, file, { cacheControl: "3600", upsert: false });

  if (storageErr) return { success: false, error: storageErr.message };

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data: asset, error: dbErr } = await admin
    .from("media_assets")
    .insert({
      filename: file.name,
      url: urlData.publicUrl,
      storage_path: storagePath,
      mime_type: file.type || null,
      size: file.size,
      alt,
      folder,
    })
    .select("*")
    .single();

  if (dbErr) return { success: false, error: dbErr.message };
  return { success: true, data: asset as MediaAsset };
}

export async function adminDeleteMedia(
  id: string,
  storagePath: string,
): Promise<MutateResult<null>> {
  const auth = await requireEditor();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([storagePath]);
  const { error } = await admin.from("media_assets").delete().eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}
