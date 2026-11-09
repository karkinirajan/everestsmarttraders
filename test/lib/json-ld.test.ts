import { describe, expect, it } from "vitest";
import { jsonLd } from "@/lib/json-ld";

describe("jsonLd", () => {
  it("is JSON that reads back to the same value", () => {
    const value = { "@type": "FAQPage", name: "Q & A", n: 3, list: [1, "two", null], nested: { ok: true } };
    expect(JSON.parse(jsonLd(value))).toEqual(value);
  });

  it("cannot close the script block it is placed in", () => {
    const text = jsonLd({ answer: 'Use </script><script>alert(1)</script> and <!-- and <img onerror=x>' });
    expect(text).not.toContain("<");
    expect(text).not.toMatch(/<\/script/i);
    expect(JSON.parse(text).answer).toBe('Use </script><script>alert(1)</script> and <!-- and <img onerror=x>');
  });

  it("escapes the line and paragraph separators, which end a line in older JavaScript parsers", () => {
    const text = jsonLd({ s: "a b c" });
    expect(text).not.toContain(" ");
    expect(text).not.toContain(" ");
    expect(JSON.parse(text).s).toBe("a b c");
  });
});
