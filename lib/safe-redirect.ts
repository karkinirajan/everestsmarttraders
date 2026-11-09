/**
 * Validates post-login redirect targets and CMS-entered URLs so untrusted query strings or editor inputs
 * can never trigger an open redirect or a `javascript:` / `data:` URI execution.
 */

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Returns `raw` only when it is a clean, relative path inside `/admin`.
 * Everything else (protocol-relative `//evil.com`, `https://...`, `/\evil.com`, non-admin paths) falls back to `/admin`.
 */
export function safeRedirectPath(raw: unknown, fallback = "/admin"): string {
  if (typeof raw !== "string") return fallback;
  if (CONTROL_CHARS.test(raw)) return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }
  if (
    trimmed === "/admin" ||
    trimmed.startsWith("/admin/") ||
    trimmed.startsWith("/admin?") ||
    trimmed.startsWith("/admin#")
  ) {
    return trimmed;
  }
  return fallback;
}

/**
 * Checks whether a URL value entered in the CMS is safe to render in `<a href>`, `<img src>`, or `<video src>`.
 * Allows empty values, relative root paths (`/images/...`), and `http:` / `https:` URLs.
 * Refuses `javascript:`, `data:`, `vbscript:`, protocol-relative `//`, and control characters.
 */
export function isSafeCmsUrl(raw: unknown): boolean {
  if (raw === null || raw === undefined || raw === "") return true;
  if (typeof raw !== "string") return false;
  if (CONTROL_CHARS.test(raw)) return false;
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (trimmed.length > 2048) return false;

  if (trimmed.startsWith("/")) {
    return !trimmed.startsWith("//") && !trimmed.includes("\\");
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
