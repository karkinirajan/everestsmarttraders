import { STORAGE_FOLDERS } from "@/lib/constants";

/**
 * What may be uploaded: the type is read from the file's bytes, never from the name or the type the browser says. Every type is
 * capped at 10 MB because a server action's body is capped (next.config.ts allows 11 MB); a longer video belongs on a video host and
 * goes in as a link (the tutorial pages have a video_url field).
 */
export const MEDIA_TYPES = {
  "image/jpeg": { extension: "jpg", maxBytes: 10 * 1024 * 1024 },
  "image/png": { extension: "png", maxBytes: 10 * 1024 * 1024 },
  "image/webp": { extension: "webp", maxBytes: 10 * 1024 * 1024 },
  "image/gif": { extension: "gif", maxBytes: 10 * 1024 * 1024 },
  "image/avif": { extension: "avif", maxBytes: 10 * 1024 * 1024 },
  "video/mp4": { extension: "mp4", maxBytes: 10 * 1024 * 1024 },
  "video/webm": { extension: "webm", maxBytes: 10 * 1024 * 1024 },
  "application/pdf": { extension: "pdf", maxBytes: 10 * 1024 * 1024 },
} as const;

export type MediaType = keyof typeof MEDIA_TYPES;

const ascii = (bytes: Uint8Array, from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));

/** Names the type from the first bytes, or null. SVG is deliberately not accepted: it can carry script. */
export function detectMediaType(bytes: Uint8Array): MediaType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 4) === "PNG" && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 6 && (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a")) return "image/gif";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12);
    if (brand === "avif" || brand === "avis") return "image/avif";
    return "video/mp4";
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "video/webm";
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

const FOLDERS: ReadonlySet<string> = new Set(Object.values(STORAGE_FOLDERS));

/** One of the known folders: anything else (including "../" tricks) lands in "general". */
export function safeFolder(raw: unknown): string {
  const folder = typeof raw === "string" ? raw.trim() : "";
  return FOLDERS.has(folder) ? folder : STORAGE_FOLDERS.general;
}

/** The part of the file name that is kept: letters, digits, dot, dash, underscore; no leading dots; the type decides the extension. */
export function safeBaseName(originalName: string): string {
  // only the last path segment, and only a real extension (something before it, a short run of letters and digits after it)
  const lastSegment = originalName.split(/[\\/]/).pop() ?? "";
  const withoutExtension = lastSegment.replace(/(?<=[^.])\.[A-Za-z0-9]{1,8}$/, "");
  const base = withoutExtension.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^[._-]+|[._-]+$/g, "").toLowerCase().slice(0, 80);
  return base || "file";
}

export function storageFileName(hash: string, originalName: string, type: MediaType): string {
  return `${hash}_${safeBaseName(originalName)}.${MEDIA_TYPES[type].extension}`;
}
