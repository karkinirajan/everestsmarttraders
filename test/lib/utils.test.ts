import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  cn,
  formatDate,
  formatPriceRange,
  getInitials,
  readingTime,
  slugify,
  truncate,
  whatsappLink,
} from "@/lib/utils";
import { pickFallbackImage } from "@/lib/image-fallbacks";

describe("lib/utils", () => {
  it("cn merges tailwind classes cleanly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("slugify normalizes titles into URL-safe slugs", () => {
    expect(slugify("CAME BX-74 Sliding Gate!")).toBe("came-bx-74-sliding-gate");
    expect(slugify("  Multiple   Spaces & Symbols  ")).toBe("multiple-spaces-symbols");
  });

  it("formatDate formats ISO strings and handles null/empty", () => {
    expect(formatDate("2026-01-15T00:00:00Z")).toContain("2026");
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });

  it("truncate shortens long strings and leaves short strings intact", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("hello world", 5)).toBe("hello…");
  });

  it("whatsappLink formats Nepal phone numbers and optional messages", () => {
    expect(whatsappLink("9851336266")).toBe("https://wa.me/9779851336266");
    expect(whatsappLink("+977-9851336266", "Hello EST")).toBe(
      "https://wa.me/9779851336266?text=Hello%20EST",
    );
  });

  it("readingTime, formatPriceRange, and getInitials work as expected", () => {
    expect(readingTime("<p>Hello world from Everest Smart Traders</p>")).toBe(1);
    expect(formatPriceRange(null)).toBe("Contact for price");
    expect(formatPriceRange("NPR 45,000")).toBe("NPR 45,000");
    expect(getInitials("Nirajan Karki")).toBe("NK");
  });

  it("absoluteUrl builds canonical site URLs", () => {
    expect(absoluteUrl("/showcase")).toMatch(/^https?:\/\/.*\/showcase$/);
    expect(absoluteUrl("contact")).toMatch(/^https?:\/\/.*\/contact$/);
  });
});

describe("lib/image-fallbacks", () => {
  it("picks a deterministic local fallback image for any seed", () => {
    const a = pickFallbackImage("sliding-gate-motor", 10);
    const b = pickFallbackImage("sliding-gate-motor", 10);
    expect(a).toBe(b);
    expect(a).toMatch(/^\/images\/home-automation\/home-automation-\d{3}\.jpg$/);
    expect(pickFallbackImage("", 0)).toMatch(/^\/images\/home-automation\//);
  });
});
