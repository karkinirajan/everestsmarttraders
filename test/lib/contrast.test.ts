import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * WCAG 2.2 AA contrast verification for the CSS custom properties in app/globals.css.
 * Converts oklch(L C H) tokens to sRGB relative luminance and verifies >= 4.5:1
 * contrast for all foreground / surface pairs in both :root (light) and .dark (admin).
 */
function parseOklchTokens(cssBlock: string): Record<string, [number, number, number]> {
  const tokens: Record<string, [number, number, number]> = {};
  const re = /--([a-z0-9-]+)\s*:\s*oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cssBlock)) !== null) {
    tokens[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return tokens;
}

function oklchToLuminance([L, C, H]: [number, number, number]): number {
  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(bl);
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = oklchToLuminance(fg);
  const l2 = oklchToLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("WCAG 2.2 AA color contrast in app/globals.css", () => {
  const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  const darkMatch = css.match(/\.dark\s*\{([\s\S]*?)\n\}/);

  const light = parseOklchTokens(rootMatch?.[1] ?? "");
  const dark = parseOklchTokens(darkMatch?.[1] ?? "");

  const pairs: [string, string][] = [
    ["foreground", "background"],
    ["card-foreground", "card"],
    ["popover-foreground", "popover"],
    ["primary-foreground", "primary"],
    ["secondary-foreground", "secondary"],
    ["muted-foreground", "background"],
    ["muted-foreground", "card"],
    ["muted-foreground", "muted"],
    ["accent-foreground", "accent"],
    ["placeholder", "field"],
    ["destructive", "destructive-muted"],
    ["destructive", "card"],
    ["success", "success-muted"],
    ["warning", "warning-muted"],
    ["info", "info-muted"],
    ["violet", "violet-muted"],
    ["brand", "brand-muted"],
    ["brand", "card"],
    ["brand-foreground", "brand"],
    ["est-amber-foreground", "est-amber"],
  ];

  it.each(pairs)("light mode: --%s on --%s is at least 4.5:1", (fg, bg) => {
    expect(light[fg]).toBeDefined();
    expect(light[bg]).toBeDefined();
    expect(contrastRatio(light[fg], light[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(pairs)("dark mode (admin dashboard): --%s on --%s is at least 4.5:1", (fg, bg) => {
    expect(dark[fg]).toBeDefined();
    expect(dark[bg]).toBeDefined();
    expect(contrastRatio(dark[fg], dark[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
