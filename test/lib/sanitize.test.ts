import { describe, expect, it } from "vitest";
import { dangerousHtml, sanitizeRichHtml } from "@/lib/sanitize";

describe("sanitizeRichHtml keeps what the CMS content is made of", () => {
  it.each([
    ["headings and paragraphs", "<h2>Title</h2><p>Body text</p>"],
    ["lists", "<ul><li>One</li><li>Two</li></ul><ol><li>First</li></ol>"],
    ["emphasis", "<p><strong>Bold</strong> and <em>italic</em></p>"],
    ["a table", "<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>"],
    ["a quote and code", "<blockquote>Quote</blockquote><pre><code>x = 1</code></pre>"],
  ])("%s are unchanged", (_name, html) => expect(sanitizeRichHtml(html)).toBe(html));

  it("keeps an https link and an https image", () => {
    const out = sanitizeRichHtml('<a href="https://example.com/page" title="T">go</a><img src="https://cdn.example.com/a.jpg" alt="A">');
    expect(out).toContain('href="https://example.com/page"');
    expect(out).toContain('src="https://cdn.example.com/a.jpg"');
    expect(out).toContain('alt="A"');
  });

  it("keeps mailto: and tel: links", () => {
    const out = sanitizeRichHtml('<a href="mailto:info@example.com">mail</a> <a href="tel:+9779800000000">call</a>');
    expect(out).toContain('href="mailto:info@example.com"');
    expect(out).toContain('href="tel:+9779800000000"');
  });

  it("adds rel=noopener noreferrer to a link that opens a new tab, and drops target otherwise", () => {
    expect(sanitizeRichHtml('<a href="https://e.com" target="_blank">x</a>')).toMatch(/target="_blank" rel="noopener noreferrer"|rel="noopener noreferrer" target="_blank"/);
    expect(sanitizeRichHtml('<a href="https://e.com" target="_top">x</a>')).not.toContain("target");
  });

  it("makes images lazy", () => expect(sanitizeRichHtml('<img src="https://e.com/a.png" alt="a">')).toContain('loading="lazy"'));
  it("returns an empty string for nothing", () => {
    expect(sanitizeRichHtml(null)).toBe("");
    expect(sanitizeRichHtml(undefined)).toBe("");
    expect(sanitizeRichHtml("")).toBe("");
  });
});

// Each of these ran script in the browser, or was a classic way past a pattern-based cleaner.
const ATTACKS: [string, string][] = [
  ["a script tag", "<script>alert(1)</script>"],
  ["a script tag in mixed case", "<ScRiPt>alert(1)</sCrIpT>"],
  ["an unterminated script tag", "<script>alert(1)"],
  ["nested tags that rebuild a script", "<scr<script>ipt>alert(1)</scr</script>ipt>"],
  ["an onerror handler", '<img src=x onerror="alert(1)">'],
  ["an onerror handler separated by slashes", "<img/src=x/onerror=alert(1)>"],
  ["an onerror handler with no quotes", "<img src=x onerror=alert(1)>"],
  ["an onload handler on svg", "<svg onload=alert(1)>"],
  ["an event handler on a link", '<a href="https://e.com" onclick="alert(1)">x</a>'],
  ["an event handler on a body tag", "<body onload=alert(1)>"],
  ["javascript: in quotes", '<a href="javascript:alert(1)">x</a>'],
  ["javascript: with no quotes", "<a href=javascript:alert(1)>x</a>"],
  ["javascript: in mixed case", '<a href="JaVaScRiPt:alert(1)">x</a>'],
  ["javascript: with a leading space", '<a href=" javascript:alert(1)">x</a>'],
  ["javascript: with a tab inside", '<a href="java\tscript:alert(1)">x</a>'],
  ["javascript: written as entities", '<a href="&#106;avascript:alert(1)">x</a>'],
  ["javascript: written as hex entities", '<a href="&#x6A;avascript:alert(1)">x</a>'],
  ["a data: link", '<a href="data:text/html,<script>alert(1)</script>">x</a>'],
  ["a data: image", '<img src="data:image/svg+xml,<svg onload=alert(1)>">'],
  ["a vbscript: link", '<a href="vbscript:msgbox(1)">x</a>'],
  ["a protocol-relative link", '<a href="//evil.example/x">x</a>'],
  ["an iframe", '<iframe src="https://evil.example"></iframe>'],
  ["an iframe with srcdoc", '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
  ["an object", '<object data="javascript:alert(1)"></object>'],
  ["an embed", '<embed src="javascript:alert(1)">'],
  ["a form that posts elsewhere", '<form action="https://evil.example"><input name=p><button>go</button></form>'],
  ["a base tag", '<base href="https://evil.example/">'],
  ["a meta refresh", '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'],
  ["a link tag", '<link rel="stylesheet" href="https://evil.example/x.css">'],
  ["a style tag", "<style>body{background:url(javascript:alert(1))}</style>"],
  ["a style attribute", '<p style="background:url(javascript:alert(1))">x</p>'],
  ["a style attribute on a table header", '<table><tr><th style="x:expression(alert(1))" colspan="2">x</th></tr></table>'],
  ["a style attribute on a table cell", '<table><tr><td style="background:url(javascript:alert(1))">x</td></tr></table>'],
  ["math with a script", "<math><mi xlink:href=javascript:alert(1)>x</mi></math>"],
  ["a comment that closes early", "<!--><script>alert(1)</script>-->"],
  ["a noscript trick", '<noscript><p title="</noscript><img src=x onerror=alert(1)>">'],
  ["a textarea trick", "<textarea><script>alert(1)</script></textarea>"],
  ["a null byte", "<scr\0ipt>alert(1)</scr\0ipt>"],
];

describe("sanitizeRichHtml removes what runs script", () => {
  it.each(ATTACKS)("%s", (_name, payload) => {
    const out = sanitizeRichHtml(payload);
    expect(out).not.toMatch(/<\s*script/i);
    expect(out).not.toMatch(/<\s*(iframe|object|embed|form|input|button|base|meta|link|style|svg|math|noscript|textarea)/i);
    expect(out).not.toMatch(/\son\w+\s*=/i);
    expect(out).not.toMatch(/(javascript|vbscript)\s*:/i);
    expect(out).not.toMatch(/\bdata\s*:/i);
    expect(out).not.toMatch(/\sstyle\s*=/i);
    expect(out).not.toMatch(/href\s*=\s*["']?\s*\/\//i);
  });

  it("also leaves the text of a removed script out, so it cannot be read as content", () => {
    expect(sanitizeRichHtml("<p>hi</p><script>steal()</script>")).toBe("<p>hi</p>");
  });
});

describe("dangerousHtml", () => {
  it("wraps the cleaned HTML for dangerouslySetInnerHTML", () => {
    expect(dangerousHtml("<p>ok</p><script>x()</script>")).toEqual({ __html: "<p>ok</p>" });
    expect(dangerousHtml(null)).toEqual({ __html: "" });
  });
});
