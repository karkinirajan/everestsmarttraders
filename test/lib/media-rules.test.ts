import { describe, expect, it } from "vitest";
import { MEDIA_TYPES, detectMediaType, isSafeStoragePath, safeBaseName, safeFolder, storageFileName } from "@/lib/media-rules";

const bytes = (...values: (number | string)[]) => Uint8Array.from(values.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v])));

describe("detectMediaType reads the bytes", () => {
  it.each<[string, Uint8Array, string]>([
    ["jpeg", bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0), "image/jpeg"],
    ["png", bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a, 0, 0), "image/png"],
    ["gif87a", bytes("GIF87a", 0, 0), "image/gif"],
    ["gif89a", bytes("GIF89a", 0, 0), "image/gif"],
    ["webp", bytes("RIFF", 0, 0, 0, 0, "WEBP"), "image/webp"],
    ["avif", bytes(0, 0, 0, 0x1c, "ftypavif"), "image/avif"],
    ["avif sequence", bytes(0, 0, 0, 0x1c, "ftypavis"), "image/avif"],
    ["mp4", bytes(0, 0, 0, 0x20, "ftypisom"), "video/mp4"],
    ["webm", bytes(0x1a, 0x45, 0xdf, 0xa3, 0, 0), "video/webm"],
    ["pdf", bytes("%PDF-1.7"), "application/pdf"],
  ])("%s", (_name, data, type) => expect(detectMediaType(data)).toBe(type));

  it.each<[string, Uint8Array]>([
    ["svg", bytes('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>')],
    ["html", bytes("<!doctype html><script>alert(1)</script>")],
    ["javascript", bytes("alert(1)")],
    ["an executable", bytes("MZ", 0x90, 0, 3, 0, 0, 0)],
    ["a shell script", bytes("#!/bin/sh\necho hi\n")],
    ["a png missing its tail", bytes(0x89, "PNG")],
    ["a jpeg-like header missing its third byte", bytes(0xff, 0xd8, 0x00, 0x00)],
    ["a riff that is not webp", bytes("RIFF", 0, 0, 0, 0, "WAVE")],
    ["nothing", new Uint8Array(0)],
    ["a single byte", bytes(0xff)],
  ])("refuses %s", (_name, data) => expect(detectMediaType(data)).toBeNull());
});

describe("limits", () => {
  it("caps every type, at 10 MB, and has an extension for each", () => {
    for (const [type, rule] of Object.entries(MEDIA_TYPES)) {
      expect(rule.maxBytes, type).toBe(10 * 1024 * 1024);
      expect(rule.extension).toMatch(/^[a-z0-9]+$/);
    }
  });
  it("accepts no svg", () => expect(Object.keys(MEDIA_TYPES)).not.toContain("image/svg+xml"));
});

describe("safeFolder", () => {
  it.each(["products", "projects", "blog", "services", "general", "site"])("keeps %s", (f) => expect(safeFolder(f)).toBe(f));
  it.each(["../../etc", "products/../site", "/products", "products/", "PRODUCTS", "", "  ", null, undefined, 5, { toString: () => "products" }])("sends %j to general", (f) => expect(safeFolder(f)).toBe("general"));
  it("trims", () => expect(safeFolder(" blog ")).toBe("blog"));
});

describe("file names", () => {
  it.each([
    ["Front Gate Photo.JPG", "front_gate_photo"],
    ["../../../etc/passwd", "passwd"],
    ["...hidden", "hidden"],
    ["a b/c\\d.png", "d"],
    ["my photo (1).png", "my_photo_1"],
    ["archive.tar.gz", "archive_tar"],
    ["<script>.png", "script"],
    ["日本語.png", "file"],
    ["", "file"],
    [".", "file"],
  ])("safeBaseName(%j) = %j", (name, expected) => expect(safeBaseName(name)).toBe(expected));
  it("shortens a long name", () => expect(safeBaseName("x".repeat(300) + ".png").length).toBe(80));
  it("takes the extension from the detected type, not the name", () => {
    expect(storageFileName("abc123", "invoice.html", "image/png")).toBe("abc123_invoice.png");
    expect(storageFileName("abc123", "photo.exe", "image/jpeg")).toBe("abc123_photo.jpg");
  });
});

describe("isSafeStoragePath", () => {
  it.each(["products/abcdef0123456789_gate.png", "general/0123456789abcdef_my-photo.jpg", "blog/a/b/c.png", "site/Old Upload (1).JPG"])("accepts %j", (p) => expect(isSafeStoragePath(p)).toBe(true));
  it.each([
    "", "gate.png", "/products/a.png", "products//a.png", "products/../site/a.png", "../products/a.png", "products/./a.png", "products/a.png/..",
    "unknown/a.png", "products\\a.png", "products/a\u0000.png", "products/a\n.png", "products/", "x".repeat(301), null, undefined, 5, {},
  ])("refuses %j", (p) => expect(isSafeStoragePath(p)).toBe(false));
});

