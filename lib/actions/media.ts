"use server";

import { requireEditor } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { isUuid, publicMessage } from "@/lib/admin-rules";
import { MEDIA_TYPES, detectMediaType, safeFolder, storageFileName } from "@/lib/media-rules";
import type { MutateResult } from "@/lib/actions/admin-mutate";

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "media";

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
 *
 * What is stored is decided here, not by the browser: the type is read from
 * the file's bytes (images, mp4/webm video and PDF; never SVG, which can
 * carry script), the size is capped per type, the folder must be a known one
 * and the stored name and content type come from the detected type.
 */
export async function adminUploadMedia(
  formData: FormData,
): Promise<MutateResult<MediaAsset>> {
  const auth = await requireEditor();
  if (!auth.ok) return { success: false, error: auth.error };

  const file = formData.get("file");
  const folder = safeFolder(formData.get("folder"));
  const alt = String(formData.get("alt") ?? "").slice(0, 300) || null;

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "No file provided." };
  }

  const buffer = await file.arrayBuffer();
  const type = detectMediaType(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 16)));
  if (!type) {
    return { success: false, error: "That file type is not allowed. Use JPEG, PNG, WebP, GIF, AVIF, MP4, WebM or PDF." };
  }
  if (buffer.byteLength > MEDIA_TYPES[type].maxBytes) {
    return { success: false, error: `That file is too large (the limit is ${MEDIA_TYPES[type].maxBytes / (1024 * 1024)} MB for this type).` };
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
  const storagePath = `${folder}/${storageFileName(hash, file.name, type)}`;

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
    .upload(storagePath, buffer, { cacheControl: "3600", upsert: false, contentType: type });

  if (storageErr) {
    console.error("[admin] media upload failed:", storageErr.message);
    return { success: false, error: "Could not upload the file. Please try again." };
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data: asset, error: dbErr } = await admin
    .from("media_assets")
    .insert({
      filename: file.name.slice(0, 200),
      url: urlData.publicUrl,
      storage_path: storagePath,
      mime_type: type,
      size: file.size,
      alt,
      folder,
    })
    .select("*")
    .single();

  if (dbErr) {
    console.error("[admin] media record failed:", dbErr.code ?? "", dbErr.message);
    return { success: false, error: publicMessage(dbErr) };
  }
  return { success: true, data: asset as MediaAsset };
}

/** Deletes a library item. The stored file is the one the record names: a path from the browser is never trusted. */
export async function adminDeleteMedia(id: string): Promise<MutateResult<null>> {
  const auth = await requireEditor();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!isUuid(id)) return { success: false, error: "Invalid id." };

  const admin = createAdminClient();
  const { data: asset } = await admin.from("media_assets").select("storage_path").eq("id", id).maybeSingle();
  if (!asset) return { success: false, error: "That file no longer exists." };

  const { error: storageErr } = await admin.storage.from(BUCKET).remove([asset.storage_path]);
  if (storageErr) {
    console.error("[admin] media remove failed:", storageErr.message);
    return { success: false, error: "Could not delete the file. Please try again." };
  }
  const { error } = await admin.from("media_assets").delete().eq("id", id);

  if (error) {
    console.error("[admin] media record delete failed:", error.code ?? "", error.message);
    return { success: false, error: publicMessage(error) };
  }
  return { success: true, data: null };
}
