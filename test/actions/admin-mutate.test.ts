import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshFake, holder } from "../helpers/mocks";

vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: () => holder.fake }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => holder.fake.sessionClient() }));
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => cache);

import { adminDelete, adminInsert, adminUpdate, adminUpsert } from "@/lib/actions/admin-mutate";

const ID = "123e4567-e89b-42d3-a456-426614174000";
let fake: ReturnType<typeof freshFake>;
const asEditor = () => { fake.user = { id: "u1" }; fake.profileRole = "editor"; };

beforeEach(() => {
  fake = freshFake();
  cache.revalidatePath.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

const OPS: [string, () => Promise<{ success: boolean; error?: string }>][] = [
  ["insert", () => adminInsert("products", { name: "x" })],
  ["update", () => adminUpdate("products", ID, { name: "x" })],
  ["upsert", () => adminUpsert("site_settings", { key: "k", value: 1 }, "key")],
  ["delete", () => adminDelete("products", ID)],
];

describe.each(OPS)("adminX %s: who may call it", (_name, call) => {
  it("refuses someone who is not signed in, and touches nothing", async () => {
    expect(await call()).toEqual({ success: false, error: "Not signed in." });
    expect(fake.calls).toEqual([]);
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });
  it("refuses a viewer", async () => {
    fake.user = { id: "u1" };
    fake.profileRole = "viewer";
    expect(await call()).toEqual({ success: false, error: "Not authorized." });
    expect(fake.calls).toEqual([]);
  });
  it("refuses a signed-in user with no profile", async () => {
    fake.user = { id: "u1" };
    fake.profileRole = null;
    expect(await call()).toEqual({ success: false, error: "Not authorized." });
  });
  it.each(["editor", "admin"])("lets an %s through", async (role) => {
    fake.user = { id: "u1" };
    fake.profileRole = role;
    fake.setDefault({ data: { id: ID }, error: null });
    expect((await call()).success).toBe(true);
    expect(cache.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("the table allow-list", () => {
  it.each(["profiles", "auth.users", "rate_limits"])("%s is refused before anything else", async (table) => {
    asEditor();
    for (const result of [await adminInsert(table, {}), await adminUpdate(table, ID, {}), await adminUpsert(table, {}, "id"), await adminDelete(table, ID)]) {
      expect(result).toEqual({ success: false, error: expect.stringContaining("not a manageable table") });
    }
    expect(fake.calls).toEqual([]);
  });
  it("is checked before the session, so the answer says nothing about who is signed in", async () => {
    expect(await adminInsert("profiles", {})).toEqual({ success: false, error: expect.stringContaining("not a manageable table") });
  });
});

describe("what is written", () => {
  beforeEach(() => { asEditor(); fake.setDefault({ data: { id: ID, name: "Gate" }, error: null }); });

  it("insert sends the payload without the database-owned columns", async () => {
    const result = await adminInsert("products", { id: "chosen", created_at: "2000-01-01", updated_at: "x", name: "Gate" });
    expect(result).toEqual({ success: true, data: { id: ID, name: "Gate" } });
    expect(fake.calls[0]).toMatchObject({ table: "products", op: "insert" });
    expect(fake.calls[0]?.payload).toEqual({ name: "Gate" }); // exactly: nothing the browser added for itself
  });
  it("update is keyed on the id argument and cannot move the row", async () => {
    await adminUpdate("services", ID, { id: "another", title: "T" });
    expect(fake.calls[0]).toMatchObject({ table: "services", op: "update" });
    expect(fake.calls[0]?.payload).toEqual({ title: "T" });
    expect(fake.calls[0]?.filters).toEqual([["eq:id", ID]]);
  });
  it("upsert is keyed on the named column and keeps that column", async () => {
    await adminUpsert("announcements", { id: ID, text: "Sale" }, "id");
    expect(fake.calls[0]).toMatchObject({ table: "announcements", op: "upsert", payload: { id: ID, text: "Sale" }, options: { onConflict: "id" } });
    await adminUpsert("site_settings", { key: "phone", value: "1", id: "x" }, "key");
    expect(fake.calls[1]?.payload).toEqual({ key: "phone", value: "1" });
  });
  it("delete is keyed on the id", async () => {
    await adminDelete("faqs", ID);
    expect(fake.calls[0]).toMatchObject({ table: "faqs", op: "delete" });
    expect(fake.calls[0]?.filters).toEqual([["eq:id", ID]]);
  });
});

describe("bad arguments are refused before the database", () => {
  beforeEach(asEditor);
  it.each(["", "1", "not-a-uuid", "' or 1=1 --", ID + "x"])("update and delete refuse the id %j", async (id) => {
    expect(await adminUpdate("products", id, {})).toEqual({ success: false, error: "Invalid id." });
    expect(await adminDelete("products", id)).toEqual({ success: false, error: "Invalid id." });
    expect(fake.calls).toEqual([]);
  });
  it.each(["value", "key,value", "id", ""])("upsert refuses the conflict column %j for site_settings", async (column) => {
    expect((await adminUpsert("site_settings", { key: "a" }, column)).success).toBe(column === "key");
  });
  it("upsert refuses a table with no allowed conflict column", async () => {
    expect(await adminUpsert("products", { slug: "a" }, "slug")).toEqual({ success: false, error: "That table cannot be saved this way." });
  });
  it.each([null, "text", [1], 7])("refuses the payload %j", async (payload) => {
    expect(await adminInsert("products", payload as never)).toEqual({ success: false, error: "Invalid data." });
    expect(await adminUpdate("products", ID, payload as never)).toEqual({ success: false, error: "Invalid data." });
    expect(fake.calls).toEqual([]);
  });
});

describe("failures", () => {
  beforeEach(asEditor);
  it("never show the database's own text, and log it", async () => {
    fake.setDefault({ data: null, error: { code: "42P01", message: 'relation "internal_secret_table" does not exist' } });
    const result = await adminInsert("products", { name: "x" });
    expect(result).toEqual({ success: false, error: "Could not save. Please try again." });
    expect(JSON.stringify(result)).not.toContain("internal_secret_table");
    expect(console.error).toHaveBeenCalled();
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });
  it("explain a duplicate in a sentence", async () => {
    fake.setDefault({ data: null, error: { code: "23505", message: 'duplicate key value violates unique constraint "products_slug_key"' } });
    const result = await adminUpdate("products", ID, { slug: "taken" });
    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toMatch(/already in use/);
    expect(JSON.stringify(result)).not.toContain("products_slug_key");
  });
  it("cover delete and upsert as well", async () => {
    fake.setDefault({ data: null, error: { code: "23503", message: "violates foreign key constraint" } });
    expect(await adminDelete("products", ID)).toEqual({ success: false, error: expect.stringMatching(/linked to other content/) });
    expect((await adminUpsert("site_settings", { key: "a" }, "key")).success).toBe(false);
  });
});
