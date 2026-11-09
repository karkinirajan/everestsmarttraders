import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshFake, holder } from "../helpers/mocks";

vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: () => holder.fake }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => holder.fake.sessionClient() }));

import { adminDeleteMedia, adminUploadMedia } from "@/lib/actions/media";

const ID = "123e4567-e89b-42d3-a456-426614174000";
let fake: ReturnType<typeof freshFake>;

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8];
const SVG = [...'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'].map((c) => c.charCodeAt(0));
const upload = (bytes: number[] | Uint8Array, name = "photo.png", extra: Record<string, string> = {}, declaredType = "image/png") => {
  const fd = new FormData();
  fd.set("file", new File([Uint8Array.from(bytes)], name, { type: declaredType }));
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  return adminUploadMedia(fd);
};

beforeEach(() => {
  fake = freshFake();
  fake.user = { id: "u1" };
  fake.profileRole = "editor";
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("adminUploadMedia", () => {
  beforeEach(() => {
    fake.answer("media_assets.select", { data: null, error: null }); // not uploaded before
    fake.answer("media_assets.insert", { data: { id: ID, storage_path: "stub" }, error: null });
  });

  it("is for editors and admins only", async () => {
    fake.profileRole = "viewer";
    expect(await upload(PNG)).toEqual({ success: false, error: "Not authorized." });
    fake.user = null;
    expect(await upload(PNG)).toEqual({ success: false, error: "Not signed in." });
    expect(fake.storageCalls).toEqual([]);
  });

  it("stores a real image under a generated name with the detected content type", async () => {
    const result = await upload(PNG, "My Front Gate.PNG", { folder: "products", alt: "A gate" });
    expect(result.success).toBe(true);
    const put = fake.storageCalls.find((c) => c.op === "upload");
    expect(put?.bucket).toBe("media");
    const [path, , options] = put?.args as [string, unknown, { contentType: string; upsert: boolean }];
    expect(path).toMatch(/^products\/[0-9a-f]{16}_my_front_gate\.png$/);
    expect(options.contentType).toBe("image/png");
    expect(options.upsert).toBe(false);
    const insert = fake.calls.find((c) => c.op === "insert");
    expect(insert?.payload).toMatchObject({ mime_type: "image/png", folder: "products", alt: "A gate", storage_path: path });
  });

  it("stores the type the bytes show, not the one the browser declared", async () => {
    const result = await upload(PNG, "evil.html", {}, "text/html");
    expect(result.success).toBe(true);
    const put = fake.storageCalls.find((c) => c.op === "upload");
    const [path, , options] = put?.args as [string, unknown, { contentType: string }];
    expect(options.contentType).toBe("image/png");
    expect(path).toMatch(/\.png$/);
    expect(fake.calls.find((c) => c.op === "insert")?.payload).toMatchObject({ mime_type: "image/png" });
  });

  it("refuses an SVG (it can carry script) even when the browser says it is a PNG and the name says .png", async () => {
    const result = await upload(SVG, "logo.png");
    expect(result).toEqual({ success: false, error: expect.stringContaining("not allowed") });
    expect(fake.storageCalls).toEqual([]);
  });

  it.each([
    ["html", [..."<html><script>alert(1)</script>"].map((c) => c.charCodeAt(0)), "page.html"],
    ["an executable", [0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0], "setup.exe"],
    ["a script", [..."#!/bin/sh\nrm -rf /\n"].map((c) => c.charCodeAt(0)), "run.sh"],
  ])("refuses %s", async (_name, bytes, filename) => {
    expect((await upload(bytes, filename)).success).toBe(false);
    expect(fake.storageCalls).toEqual([]);
  });

  it("refuses an empty file and a missing file", async () => {
    expect(await upload([], "a.png")).toEqual({ success: false, error: "No file provided." });
    expect(await adminUploadMedia(new FormData())).toEqual({ success: false, error: "No file provided." });
  });

  it("refuses a file over the size limit and accepts one just under", async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set(PNG);
    const result = await upload(big);
    expect(result).toEqual({ success: false, error: expect.stringContaining("too large") });
    const fits = new Uint8Array(10 * 1024 * 1024);
    fits.set(PNG);
    expect((await upload(fits)).success).toBe(true);
  });

  it.each(["../../etc", "products/../../x", "/abs", "unknown", ""])("puts the folder %j in general", async (folder) => {
    await upload(PNG, "a.png", { folder });
    const path = (fake.storageCalls.find((c) => c.op === "upload")?.args as [string])[0];
    expect(path.startsWith("general/")).toBe(true);
  });

  it("will not upload the same file twice", async () => {
    fake = freshFake();
    fake.user = { id: "u1" };
    fake.profileRole = "editor";
    fake.answer("media_assets.select", { data: { filename: "earlier.png" }, error: null });
    const result = await upload(PNG);
    expect(result).toEqual({ success: false, error: expect.stringContaining("already been uploaded") });
    expect(fake.storageCalls).toEqual([]);
  });

  it("answers a storage failure with a sentence, not the provider's text", async () => {
    fake.storageError = { message: "Bucket not found: secret-bucket-name" };
    const result = await upload(PNG);
    expect(result).toEqual({ success: false, error: "Could not upload the file. Please try again." });
    expect(JSON.stringify(result)).not.toContain("secret-bucket-name");
  });

  it("answers a failed record insert with a sentence", async () => {
    fake = freshFake();
    fake.user = { id: "u1" };
    fake.profileRole = "editor";
    fake.answer("media_assets.select", { data: null, error: null });
    fake.answer("media_assets.insert", { data: null, error: { code: "XX000", message: "internal detail" } });
    const result = await upload(PNG);
    expect(result).toEqual({ success: false, error: "Could not save. Please try again." });
  });
});

describe("adminDeleteMedia", () => {
  it("is for editors and admins only", async () => {
    fake.profileRole = "viewer";
    expect(await adminDeleteMedia(ID)).toEqual({ success: false, error: "Not authorized." });
    expect(fake.storageCalls).toEqual([]);
  });
  it("refuses an id that is not a uuid", async () => {
    expect(await adminDeleteMedia("../x")).toEqual({ success: false, error: "Invalid id." });
  });
  it("deletes the file the RECORD names, never a path from the browser", async () => {
    fake.answer("media_assets.select", { data: { storage_path: "products/abc_gate.png" }, error: null });
    expect(await adminDeleteMedia(ID)).toEqual({ success: true, data: null });
    expect(fake.storageCalls).toEqual([{ op: "remove", bucket: "media", args: [["products/abc_gate.png"]] }]);
    expect(fake.calls.find((c) => c.op === "delete")?.filters).toEqual([["eq:id", ID]]);
  });
  it.each(["../secret/x.png", "/etc/passwd", "unknown/x.png", "products/../../x.png", "gate.png", ""])("will not remove the unsafe path %j that a record might name", async (path) => {
    fake.answer("media_assets.select", { data: { storage_path: path }, error: null });
    const result = await adminDeleteMedia(ID);
    expect(result.success).toBe(false);
    expect(fake.storageCalls).toEqual([]);
    expect(fake.calls.some((c) => c.op === "delete")).toBe(false);
  });
  it("says so when the record is gone, and removes nothing", async () => {
    fake.answer("media_assets.select", { data: null, error: null });
    expect(await adminDeleteMedia(ID)).toEqual({ success: false, error: "That file no longer exists." });
    expect(fake.storageCalls).toEqual([]);
  });
  it("keeps the record when the file could not be removed", async () => {
    fake.answer("media_assets.select", { data: { storage_path: "general/x.png" }, error: null });
    fake.storageError = { message: "boom" };
    expect(await adminDeleteMedia(ID)).toEqual({ success: false, error: "Could not delete the file. Please try again." });
    expect(fake.calls.some((c) => c.op === "delete")).toBe(false);
  });
});
