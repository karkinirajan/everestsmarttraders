import { describe, expect, it } from "vitest";
import { CONFLICT_COLUMNS, MAX_PAYLOAD_BYTES, MUTABLE_TABLES, PROTECTED_COLUMNS, checkConflictColumn, checkTable, cleanPayload, isUuid, publicMessage } from "@/lib/admin-rules";

describe("checkTable", () => {
  it.each([...MUTABLE_TABLES])("allows %s", (table) => expect(checkTable(table)).toBeNull());
  it.each(["profiles", "auth.users", "rate_limits", "pg_catalog.pg_user", "", "PRODUCTS", "products ", "products;drop table x"])("refuses %j", (table) => expect(checkTable(table)).toMatch(/not a manageable table/));
  it("never lets the people table or the counters be written from the dashboard", () => {
    expect(MUTABLE_TABLES.has("profiles")).toBe(false);
    expect(MUTABLE_TABLES.has("rate_limits")).toBe(false);
    expect(MUTABLE_TABLES.has("system_heartbeats")).toBe(false);
  });
  it("does not echo an over-long name", () => expect(checkTable("x".repeat(500))?.length).toBeLessThan(80));
});

describe("checkConflictColumn", () => {
  it.each(Object.entries(CONFLICT_COLUMNS).flatMap(([table, cols]) => cols.map((c) => [table, c] as const)))("allows %s on %s", (table, column) => expect(checkConflictColumn(table, column)).toBeNull());
  it("refuses a column the table does not use, and a table that has none", () => {
    expect(checkConflictColumn("site_settings", "value")).not.toBeNull();
    expect(checkConflictColumn("products", "slug")).not.toBeNull();
    expect(checkConflictColumn("site_settings", "key,value")).not.toBeNull();
  });
});

describe("isUuid", () => {
  it("accepts a uuid", () => expect(isUuid("123e4567-e89b-42d3-a456-426614174000")).toBe(true));
  it.each(["", "1", "abc", "123e4567-e89b-42d3-a456-42661417400", "123e4567-e89b-42d3-a456-426614174000 ", "'; delete from products; --", null, undefined, 5, {}])("refuses %j", (v) => expect(isUuid(v)).toBe(false));
});

describe("cleanPayload", () => {
  it("passes ordinary fields through", () => {
    const r = cleanPayload({ name: "Gate", price: 5, tags: ["a"], meta: { x: 1 } });
    expect(r).toEqual({ ok: true, value: { name: "Gate", price: 5, tags: ["a"], meta: { x: 1 } } });
  });
  it("drops the columns the database owns", () => {
    const r = cleanPayload({ id: "x", created_at: "2000", updated_at: "2000", name: "Gate" });
    expect(r).toEqual({ ok: true, value: { name: "Gate" } });
  });
  it("keeps the one an upsert is keyed on, and only that", () => {
    const r = cleanPayload({ id: "abc", created_at: "x", title: "T" }, ["id"]);
    expect(r).toEqual({ ok: true, value: { id: "abc", title: "T" } });
  });
  it("drops the columns that are protected for the table: a media record cannot be pointed at another stored file", () => {
    const r = cleanPayload({ alt: "A gate", filename: "gate.png", storage_path: "general/other.png", url: "https://x", mime_type: "text/html", size: 1, folder: "site" }, [], "media_assets");
    expect(r).toEqual({ ok: true, value: { alt: "A gate", filename: "gate.png" } });
    for (const column of PROTECTED_COLUMNS.media_assets ?? []) expect(r.ok && column in r.value).toBe(false);
  });
  it("protects only the named table's columns", () => {
    expect(cleanPayload({ storage_path: "x", folder: "y" }, [], "products")).toEqual({ ok: true, value: { storage_path: "x", folder: "y" } });
    expect(cleanPayload({ storage_path: "x" })).toEqual({ ok: true, value: { storage_path: "x" } });
  });
  it("drops __proto__", () => {
    const r = cleanPayload(JSON.parse('{"__proto__": {"admin": true}, "name": "x"}'));
    expect(r.ok && Object.keys(r.value)).toEqual(["name"]);
    // assigning "__proto__" on a plain object would swap its prototype: the cleaned object must not inherit anything from the input
    expect(r.ok && Object.getPrototypeOf(r.value)).toBe(Object.prototype);
    expect(r.ok && (r.value as Record<string, unknown>).admin).toBeUndefined();
  });
  it.each([null, undefined, "text", 5, [1, 2], true])("refuses %j", (v) => expect(cleanPayload(v)).toEqual({ ok: false, error: "Invalid data." }));
  it("refuses a payload that cannot be serialised", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(cleanPayload(circular)).toEqual({ ok: false, error: "Invalid data." });
  });
  it("refuses an oversized payload and accepts one just under the limit", () => {
    expect(cleanPayload({ body: "x".repeat(MAX_PAYLOAD_BYTES) }).ok).toBe(false);
    expect(cleanPayload({ body: "x".repeat(MAX_PAYLOAD_BYTES - 100) }).ok).toBe(true);
  });
  it("validates URL columns against javascript:, data:, and protocol-relative URLs", () => {
    expect(
      cleanPayload({ cover_image_url: "https://cdn.example.com/gate.jpg", link: "/contact" }),
    ).toEqual({
      ok: true,
      value: { cover_image_url: "https://cdn.example.com/gate.jpg", link: "/contact" },
    });
    expect(cleanPayload({ cover_image_url: "javascript:alert(1)" })).toEqual({
      ok: false,
      error: 'Invalid URL in "cover_image_url". Use an https:// URL or a /path.',
    });
    expect(cleanPayload({ video_url: "data:text/html,<script>alert(1)</script>" })).toEqual({
      ok: false,
      error: 'Invalid URL in "video_url". Use an https:// URL or a /path.',
    });
    expect(cleanPayload({ link: "//evil.example.com/phish" })).toEqual({
      ok: false,
      error: 'Invalid URL in "link". Use an https:// URL or a /path.',
    });
    expect(cleanPayload({ og_image: 123 })).toEqual({
      ok: false,
      error: 'Invalid URL in "og_image". Use an https:// URL or a /path.',
    });
  });
});

describe("publicMessage: what the browser is told about a failed write", () => {
  it.each([
    ["23505", /already in use/],
    ["23503", /linked to other content/],
    ["23502", /missing or not valid/],
    ["23514", /missing or not valid/],
    ["22P02", /missing or not valid/],
  ])("%s", (code, expected) => expect(publicMessage({ code })).toMatch(expected));
  it("is a generic sentence for anything else, and never the database's text", () => {
    for (const error of [undefined, null, {}, { code: "XX000" }, { code: "42P01", message: 'relation "secret_table" does not exist' } as { code: string }]) {
      expect(publicMessage(error)).toBe("Could not save. Please try again.");
    }
  });
});
