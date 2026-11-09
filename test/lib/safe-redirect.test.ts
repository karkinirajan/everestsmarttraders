import { describe, expect, it } from "vitest";
import { isSafeCmsUrl, safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it("keeps internal relative paths", () => {
    expect(safeRedirectPath("/admin")).toBe("/admin");
    expect(safeRedirectPath("/admin/inquiries?status=new#top")).toBe(
      "/admin/inquiries?status=new#top",
    );
  });

  it("rejects external, protocol-relative, backslash, and control-character redirects", () => {
    expect(safeRedirectPath("https://evil.example.com/login")).toBe("/admin");
    expect(safeRedirectPath("http://evil.example.com")).toBe("/admin");
    expect(safeRedirectPath("//evil.example.com")).toBe("/admin");
    expect(safeRedirectPath("/\\evil.example.com")).toBe("/admin");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/admin");
    expect(safeRedirectPath("/admin\r\nSet-Cookie: x=1")).toBe("/admin");
    expect(safeRedirectPath(null)).toBe("/admin");
    expect(safeRedirectPath(undefined)).toBe("/admin");
    expect(safeRedirectPath("")).toBe("/admin");
    expect(safeRedirectPath("admin/products")).toBe("/admin");
    expect(safeRedirectPath("/contact")).toBe("/admin");
    expect(safeRedirectPath(123)).toBe("/admin");
  });

  it("uses custom fallback when provided", () => {
    expect(safeRedirectPath("//evil.example.com", "/")).toBe("/");
  });
});

describe("isSafeCmsUrl", () => {
  it("allows empty values, relative paths, and http/https URLs", () => {
    expect(isSafeCmsUrl(null)).toBe(true);
    expect(isSafeCmsUrl(undefined)).toBe(true);
    expect(isSafeCmsUrl("")).toBe(true);
    expect(isSafeCmsUrl("   ")).toBe(true);
    expect(isSafeCmsUrl("/images/brand.png")).toBe(true);
    expect(isSafeCmsUrl("/showcase#projects")).toBe(true);
    expect(isSafeCmsUrl("https://everestsmarttraders.com/a.jpg")).toBe(true);
    expect(isSafeCmsUrl("http://localhost:3000/test.png")).toBe(true);
  });

  it("blocks javascript:, data:, vbscript:, protocol-relative, and malformed URLs", () => {
    expect(isSafeCmsUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeCmsUrl("JAVASCRIPT:alert(1)")).toBe(false);
    expect(isSafeCmsUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(isSafeCmsUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeCmsUrl("//evil.example.com/a.jpg")).toBe(false);
    expect(isSafeCmsUrl("/\\evil.example.com")).toBe(false);
    expect(isSafeCmsUrl("ftp://files.example.com/a.pdf")).toBe(false);
    expect(isSafeCmsUrl("not a url")).toBe(false);
    expect(isSafeCmsUrl("https://example.com/\n")).toBe(false);
    expect(isSafeCmsUrl("https://example.com/" + "a".repeat(2100))).toBe(false);
  });
});
