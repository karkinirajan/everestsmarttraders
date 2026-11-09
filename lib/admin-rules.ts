import { z } from "zod";

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
 * the one an upsert is keyed on). It must be a plain object of a sensible size.
 */
export function cleanPayload(payload: unknown, keep: readonly string[] = []): CleanResult {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return { ok: false, error: "Invalid data." };
  let size: number;
  try {
    size = JSON.stringify(payload).length;
  } catch {
    return { ok: false, error: "Invalid data." };
  }
  if (size > MAX_PAYLOAD_BYTES) return { ok: false, error: "That is too much data to save at once." };
  const value: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(payload)) {
    if (key === "__proto__") continue;
    if ((SERVER_MANAGED as readonly string[]).includes(key) && !keep.includes(key)) continue;
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
