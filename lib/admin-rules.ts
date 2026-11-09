import { z } from "zod";
import { isSafeCmsUrl } from "@/lib/safe-redirect";

/**
 * The rules the admin server actions apply before they touch the database with the service-role key (which bypasses RLS):
 * which tables, which conflict columns, what a payload may contain, and what an error may say to the browser.
 */
export const MUTABLE_TABLES: ReadonlySet<string> = new Set([
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

/** The only columns an upsert may use to decide "insert or update", per table (the ones the admin pages use). */
export const CONFLICT_COLUMNS: Readonly<Record<string, readonly string[]>> = {
  site_settings: ["key"],
  homepage_sections: ["section_key"],
  announcements: ["id"],
  seo_overrides: ["path"],
};

/**
 * Columns the generic actions may never write, per table. A media record's storage_path decides which stored file a later delete
 * removes, and url, mime_type, size and folder describe that file: they are set by adminUploadMedia from the file's bytes, so a
 * browser that could rewrite them through adminUpdate could point the record at any object in the bucket. (Only alt and filename
 * stay editable.)
 */
export const PROTECTED_COLUMNS: Readonly<Record<string, readonly string[]>> = {
  media_assets: ["storage_path", "url", "mime_type", "size", "folder"],
};

/** Columns that hold links or media URLs: must be http(s) or a root-relative path, never javascript:/data:. */
export const URL_COLUMNS: ReadonlySet<string> = new Set([
  "cover_image_url",
  "image_url",
  "video_url",
  "brochure_url",
  "og_image",
  "canonical",
  "canonical_url",
  "link",
]);

/** Set by the database, never by the browser. */
const SERVER_MANAGED = ["id", "created_at", "updated_at"] as const;

export const MAX_PAYLOAD_BYTES = 200_000;

const uuid = z.string().uuid();
export const isUuid = (value: unknown): value is string => uuid.safeParse(value).success;

export function checkTable(table: string): string | null {
  return MUTABLE_TABLES.has(table) ? null : `"${String(table).slice(0, 40)}" is not a manageable table.`;
}

export function checkConflictColumn(table: string, column: string): string | null {
  return CONFLICT_COLUMNS[table]?.includes(column) ? null : "That table cannot be saved this way.";
}

export type CleanResult = { ok: true; value: Record<string, unknown> } | { ok: false; error: string };

/**
 * The payload, without the columns the database owns (the id of a row cannot be chosen or moved by the browser; `keep` names
 * the one an upsert is keyed on), and without the columns that are protected for that table. It must be a plain object of a sensible
 * size.
 */
export function cleanPayload(payload: unknown, keep: readonly string[] = [], table = ""): CleanResult {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return { ok: false, error: "Invalid data." };
  let size: number;
  try {
    size = JSON.stringify(payload).length;
  } catch {
    return { ok: false, error: "Invalid data." };
  }
  if (size > MAX_PAYLOAD_BYTES) return { ok: false, error: "That is too much data to save at once." };
  const protectedColumns = PROTECTED_COLUMNS[table] ?? [];
  const value: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(payload)) {
    if (key === "__proto__") continue;
    if (protectedColumns.includes(key)) continue;
    if ((SERVER_MANAGED as readonly string[]).includes(key) && !keep.includes(key)) continue;
    if (URL_COLUMNS.has(key) && !isSafeCmsUrl(v)) {
      return { ok: false, error: `Invalid URL in "${key}". Use an https:// URL or a /path.` };
    }
    value[key] = v;
  }
  return { ok: true, value };
}

/** What a failed write may tell the browser: a short sentence by Postgres error code, never the database's own text. */
export function publicMessage(error: { code?: string } | null | undefined): string {
  switch (error?.code) {
    case "23505":
      return "That value is already in use (for example a slug that another item has).";
    case "23503":
      return "This item is linked to other content. Remove the link first.";
    case "23502":
    case "23514":
    case "22P02":
      return "A required value is missing or not valid.";
    default:
      return "Could not save. Please try again.";
  }
}
