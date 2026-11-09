# Deliberate bugs, one at a time: each (name, file, old text, new text) must make the suite fail.
# Run from the repo root:  python3 test/mutation/mutate.py test/mutation/mutants.py -- npx vitest run --bail 1
# (the driver checks the suite is green first; do not edit the tree while it runs; each pattern must occur exactly once)
# Faster, in separate copies of the repo: python3 test/mutation/groups.py
#
# Not listed, because they cannot change behaviour:
#  - dropping `grant execute ... to service_role` in migration 005 (the test database, like Supabase, grants it by default);
#  - the `, 1)` rounding in a window shorter than a second (Math.max(1, ...) and Math.ceil agree on every value the tests use).
import pathlib

SQ4 = "supabase/migrations/004_lock_profile_roles_and_inquiries.sql"
SQ5 = "supabase/migrations/005_rate_limits.sql"
SA = "lib/sanitize.ts"
JL = "lib/json-ld.ts"
CA = "lib/client-address.ts"
RL = "lib/rate-limit.ts"
AR = "lib/admin-rules.ts"
MR = "lib/media-rules.ts"
SE = "lib/search.ts"
RD = "lib/read-limited.ts"
AU = "lib/auth.ts"
AM = "lib/actions/admin-mutate.ts"
ME = "lib/actions/media.ts"
IN = "lib/actions/inquiry.ts"
AI = "app/api/inquiries/route.ts"
AS = "app/api/search/route.ts"

M = [
 # --- migration 004
 ("sql4: a viewer may change a role", SQ4, "     and not public.is_admin() then", "     and false then"),
 ("sql4: only a non-admin may change a role", SQ4, "     and not public.is_admin() then", "     and public.is_admin() then"),
 ("sql4: direct database access is checked too", SQ4, "     and auth.uid() is not null\n", ""),
 ("sql4: a profile id may change", SQ4, "  if new.id is distinct from old.id then", "  if false then"),
 ("sql4: the update policy does not check the new row", SQ4, "  using (id = auth.uid())\n  with check (id = auth.uid());", "  using (id = auth.uid());"),
 ("sql4: the trigger is not attached", SQ4, "create trigger profiles_prevent_privilege_change\n  before update on public.profiles\n  for each row execute function public.prevent_profile_privilege_change();", ""),
 ("sql4: the public inquiry insert is kept", SQ4, 'drop policy if exists "Inquiries: public insert" on public.inquiries;', ""),
 # --- migration 005
 ("sql5: anyone may call the counter", SQ5, "revoke all on function public.rate_limit_hit(text, integer) from public, anon, authenticated;", ""),
 ("sql5: the counters are readable", SQ5, "alter table public.rate_limits enable row level security;", ""),
 ("sql5: counter not incremented", SQ5, "do update set count = rate_limits.count + 1", "do update set count = rate_limits.count"),
 ("sql5: no minimum window", SQ5, "  if p_window_seconds < 1 then", "  if false then"),
 ("sql5: one window forever", SQ5, "v_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);", "v_start := to_timestamp(0);"),
 ("sql5: sweeps everything", SQ5, "delete from public.rate_limits where window_start < now() - interval '1 day';", "delete from public.rate_limits;"),
 ("sql5: sweeps nothing", SQ5, "delete from public.rate_limits where window_start < now() - interval '1 day';", "delete from public.rate_limits where false;"),
 # --- sanitizer
 ("sanitize: javascript: links allowed", SA, 'allowedSchemes: URL_SCHEMES,', 'allowedSchemes: [...URL_SCHEMES, "javascript"],'),
 ("sanitize: data: links allowed", SA, 'const URL_SCHEMES = ["http", "https", "mailto", "tel"];', 'const URL_SCHEMES = ["http", "https", "mailto", "tel", "data"];'),
 ("sanitize: data: images allowed", SA, 'allowedSchemesByTag: { img: ["http", "https"] },', 'allowedSchemesByTag: { img: ["http", "https", "data"] },'),
 ("sanitize: protocol-relative links allowed", SA, "allowProtocolRelative: false,", "allowProtocolRelative: true,"),
 ("sanitize: iframes allowed", SA, '"a", "img", "figure", "figcaption",', '"a", "img", "figure", "figcaption", "iframe",'),
 ("sanitize: scripts allowed", SA, '"p", "br", "hr", "blockquote", "pre", "code",', '"p", "br", "hr", "blockquote", "pre", "code", "script",'),
 ("sanitize: onclick allowed on links", SA, 'a: ["href", "title", "target", "rel"],', 'a: ["href", "title", "target", "rel", "onclick"],'),
 ("sanitize: onerror allowed on images", SA, 'img: ["src", "alt", "title", "width", "height", "loading"],', 'img: ["src", "alt", "title", "width", "height", "loading", "onerror"],'),
 ("sanitize: style attributes allowed", SA, 'th: ["colspan", "rowspan", "scope"],', 'th: ["colspan", "rowspan", "scope", "style"],'),
 ("sanitize: removed tags are escaped, not dropped", SA, 'disallowedTagsMode: "discard",', 'disallowedTagsMode: "escape",'),
 ("sanitize: new-tab links keep opener access", SA, 'if (next.target === "_blank") next.rel = "noopener noreferrer";', 'if (next.target === "_blank") next.rel = "";'),
 ("sanitize: other targets kept", SA, "else delete next.target;", "else next.target = next.target;"),
 ("sanitize: images not lazy", SA, "attribs: { ...attribs, loading: \"lazy\" }", "attribs: { ...attribs }"),
 ("sanitize: nothing is cleaned", SA, "  return sanitizeHtml(html, OPTIONS);", "  return html;"),
 # --- JSON-LD
 ("json-ld: < not escaped", JL, '.replace(/</g, "\\\\u003c")', '.replace(/</g, "<")'),
 ("json-ld: line separator not escaped", JL, '\n    .replaceAll(LINE_SEPARATOR, "\\\\u2028")', ""),
 ("json-ld: paragraph separator not escaped", JL, '\n    .replaceAll(PARAGRAPH_SEPARATOR, "\\\\u2029")', ""),
 # --- caller address
 ("address: forwarded headers always trusted", CA, 'return Boolean(env.VERCEL) || env.TRUST_PROXY_HEADERS === "true";', "return true;"),
 ("address: any value enables trust", CA, 'env.TRUST_PROXY_HEADERS === "true"', "Boolean(env.TRUST_PROXY_HEADERS)"),
 ("address: untrusted callers keep their own key", CA, "  if (!trustsForwardedHeaders(env)) return UNTRUSTED;\n", ""),
 ("address: IPv6 keyed on more than the /64", CA, "groups.slice(0, 4)", "groups.slice(0, 8)"),
 ("address: IPv4-mapped addresses kept apart", CA, "  if (mapped?.[1] && isIpv4(mapped[1])) return mapped[1];\n", ""),
 ("address: the last forwarded address is used", CA, '.split(",")[0]', '.split(",").pop()'),
 ("address: wrong group counts accepted", CA, "if (groups.length !== 8 ||", "if (false ||"),
 ("address: non-hex groups accepted", CA, "groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))", "false"),
 ("address: IPv4 range unchecked", CA, "m!.slice(1).every((part) => Number(part) <= 255)", "true"),
 # --- limiter
 ("limit: one too many allowed (memory)", RL, "const ok = bucket.count <= limit;", "const ok = bucket.count < limit;"),
 ("limit: a window never ends (memory)", RL, "if (!bucket || bucket.resetAt <= now) {", "if (!bucket) {"),
 ("limit: busiest callers are evicted first", RL, "a[1].count - b[1].count || a[1].resetAt - b[1].resetAt", "b[1].count - a[1].count || a[1].resetAt - b[1].resetAt"),
 ("limit: memory never evicted", RL, "if (buckets.size >= MAX_KEYS) evict(now);", ""),
 ("limit: everything forgotten when full", RL, "  const leastUsedFirst = [...buckets.entries()].sort", "  buckets.clear();\n  const leastUsedFirst = [...buckets.entries()].sort"),
 ("limit: expired entries kept when full", RL, "  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);\n", ""),
 ("limit: retryAfter rounds down", RL, "Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))", "Math.max(1, Math.floor((bucket.resetAt - now) / 1000))"),
 ("limit: one too many allowed (database)", RL, "const ok = count <= config.limit;", "const ok = count < config.limit;"),
 ("limit: the key holds the subject", RL, 'return `${scope}:${createHash("sha256").update(subject).digest("hex").slice(0, 32)}`;', "return `${scope}:${subject}`;"),
 ("limit: the fallback warns every time", RL, "    if (!warned) {", "    if (true) {"),
 ("limit: no fallback (a missing function blocks every form)", RL, "    return memoryRateLimit(key, config);", "    return { ok: false, remaining: 0, retryAfter: windowSeconds };"),
 ("limit: a non-number is a count", RL, "if (error || !Number.isFinite(count)) throw", "if (error) throw"),
 # --- admin rules
 ("rules: profiles writable from the dashboard", AR, '  "media_assets",\n]);', '  "media_assets",\n  "profiles",\n]);'),
 ("rules: any conflict column", AR, 'return CONFLICT_COLUMNS[table]?.includes(column) ? null : "That table cannot be saved this way.";', "return null;"),
 ("rules: ids may be set", AR, 'const SERVER_MANAGED = ["id", "created_at", "updated_at"] as const;', 'const SERVER_MANAGED = ["created_at", "updated_at"] as const;'),
 ("rules: payload size unchecked", AR, "  if (size > MAX_PAYLOAD_BYTES)", "  if (false)"),
 ("rules: __proto__ kept", AR, '    if (key === "__proto__") continue;\n', ""),
 ("rules: the upsert key is dropped", AR, "SERVER_MANAGED as readonly string[]).includes(key) && !keep.includes(key)", "SERVER_MANAGED as readonly string[]).includes(key)"),
 ("rules: arrays are payloads", AR, 'typeof payload !== "object" || payload === null || Array.isArray(payload)', 'typeof payload !== "object" || payload === null'),
 ("rules: ids are not checked", AR, "const uuid = z.string().uuid();", "const uuid = z.string();"),
 ("rules: database text shown", AR, '      return "Could not save. Please try again.";', "      return String((error as { message?: string } | undefined)?.message);"),
 ("rules: duplicates unexplained", AR, '    case "23505":\n      return "That value is already in use (for example a slug that another item has).";\n', ""),
 # --- uploads
 ("media: jpeg signature loosened", MR, "bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff", "bytes[0] === 0xff && bytes[1] === 0xd8"),
 ("media: any riff is webp", MR, 'ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP"', 'ascii(bytes, 0, 4) === "RIFF"'),
 ("media: svg accepted by sniffing text", MR, '  if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";', '  if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";\n  if (ascii(bytes, 0, 4) === "<svg") return "image/png";'),
 ("media: any folder", MR, "return FOLDERS.has(folder) ? folder : STORAGE_FOLDERS.general;", "return folder;"),
 ("media: the whole path is the name", MR, 'originalName.split(/[\\\\/]/).pop() ?? ""', "originalName"),
 ("media: names unbounded", MR, ".toLowerCase().slice(0, 80)", ".toLowerCase()"),
 ("media: extension from nowhere", MR, "}.${MEDIA_TYPES[type].extension}", "}.bin"),
 ("media: png limit lifted", MR, '"image/png": { extension: "png", maxBytes: 10 * 1024 * 1024 }', '"image/png": { extension: "png", maxBytes: 1000 * 1024 * 1024 }'),
 # --- search, body reader, session
 ("search: pattern not quoted", SE, 'return `"%${quoted}%"`;', "return `%${escaped}%`;"),
 ("search: wildcards typed by the caller work", SE, "const escaped = query.replace(/[\\\\%_]/g, (c) => `\\\\${c}`);", "const escaped = query;"),
 ("body: the count is not checked", RD, "    if (total > maxBytes) {", "    if (false) {"),
 ("body: Content-Length not checked", RD, "  if (Number.isFinite(claimed) && claimed > maxBytes) throw new PayloadTooLargeError();\n", ""),
 ("auth: any signed-in user", AU, 'if (!profile || (profile.role !== "admin" && profile.role !== "editor")) {', "if (false) {"),
 ("auth: no session needed", AU, '  if (!user) return { ok: false, error: "Not signed in." };\n', ""),
 ("auth: editors are admins", AU, 'return auth.role === "admin" ? auth :', "return true ? auth :"),
]

# --- the admin actions: per function, so each pattern is unique
def _fn(file, header, name, old, new):
    text = pathlib.Path(file).read_text()
    start = text.index(header)
    end = text.index("\nexport async function", start + 10) if "\nexport async function" in text[start + 10:] else len(text)
    segment = text[start:end]
    i = segment.index(old)
    assert segment.count(old) >= 1, (name, old)
    # the pattern is the function header through the end of the first occurrence of `old`: unique because it starts at the header
    M.append((name, file, segment[: i + len(old)], segment[:i] + new + segment[i + len(old):][:0] if False else segment[:i] + new))

_CHK = "  const tableError = checkTable(table);\n  if (tableError) return { success: false, error: tableError };\n"
_AUTH = "  const auth = await requireEditor();\n  if (!auth.ok) return { success: false, error: auth.error };\n"
for fn, label in (("adminInsert", "insert"), ("adminUpdate", "update"), ("adminUpsert", "upsert"), ("adminDelete", "delete")):
    h = f"export async function {fn}<" if fn != "adminDelete" else "export async function adminDelete("
    _fn(AM, h, f"actions: {label} skips the table check", _CHK, "")
    _fn(AM, h, f"actions: {label} skips the session check", _AUTH, "")
    _fn(AM, h, f"actions: {label} does not refresh the site", '  revalidatePath("/", "layout");\n', "")
for fn, label in (("adminUpdate", "update"), ("adminDelete", "delete")):
    _fn(AM, f"export async function {fn}" + ("<" if fn == "adminUpdate" else "("), f"actions: {label} skips the id check", '  if (!isUuid(id)) return { success: false, error: "Invalid id." };\n', "")
_fn(AM, "export async function adminInsert<", "actions: insert ignores the cleaned payload", ".insert(clean.value)", ".insert(payload)")
_fn(AM, "export async function adminUpdate<", "actions: update ignores the cleaned payload", ".update(clean.value)", ".update(payload)")
_fn(AM, "export async function adminUpdate<", "actions: update is not keyed on the id", '    .eq("id", id)\n', "")
_fn(AM, "export async function adminDelete(", "actions: delete is not keyed on the id", '.eq("id", id)', "")
_fn(AM, "export async function adminUpsert<", "actions: upsert skips the conflict-column check", "  const conflictError = checkConflictColumn(table, conflictColumn);\n  if (conflictError) return { success: false, error: conflictError };\n", "")
_fn(AM, "export async function adminUpsert<", "actions: upsert drops its key column", "cleanPayload(payload, [conflictColumn])", "cleanPayload(payload)")
_fn(AM, "export async function adminInsert<", "actions: insert shows the database's text", "  if (error) return failed(`insert into ${table}`, error);", "  if (error) return { success: false, error: error.message };")
# media
_fn(ME, "export async function adminUploadMedia(", "media: upload needs no session", _AUTH, "")
_fn(ME, "export async function adminDeleteMedia(", "media: delete needs no session", _AUTH, "")
_fn(ME, "export async function adminUploadMedia(", "media: any file type", "  if (!type) {", "  if (false) {")
_fn(ME, "export async function adminUploadMedia(", "media: any file size", "  if (buffer.byteLength > MEDIA_TYPES[type].maxBytes) {", "  if (false) {")
_fn(ME, "export async function adminUploadMedia(", "media: the folder comes straight from the browser", 'safeFolder(formData.get("folder"))', 'String(formData.get("folder") || "general")')
_fn(ME, "export async function adminUploadMedia(", "media: the browser's content type is stored", "contentType: type }", "contentType: file.type }")
_fn(ME, "export async function adminUploadMedia(", "media: an empty file is accepted", " || file.size === 0", "")
_fn(ME, "export async function adminUploadMedia(", "media: duplicates uploaded again", "  if (existing) {", "  if (false) {")
_fn(ME, "export async function adminUploadMedia(", "media: storage error text shown", '    return { success: false, error: "Could not upload the file. Please try again." };', "    return { success: false, error: storageErr.message };")
_fn(ME, "export async function adminDeleteMedia(", "media: delete skips the id check", '  if (!isUuid(id)) return { success: false, error: "Invalid id." };\n', "")
_fn(ME, "export async function adminDeleteMedia(", "media: delete of a missing record carries on", '  if (!asset) return { success: false, error: "That file no longer exists." };\n', "")
_fn(ME, "export async function adminDeleteMedia(", "media: the record goes even if the file stays", '  if (storageErr) {\n    console.error("[admin] media remove failed:", storageErr.message);\n    return { success: false, error: "Could not delete the file. Please try again." };\n  }\n', "")
# forms
for fn, label in (("submitContactInquiry", "contact"), ("submitQuoteRequest", "quote")):
    h = f"export async function {fn}("
    _fn(IN, h, f"forms: {label} is not rate limited", "  if (await overLimit()) return TOO_MANY;\n", "")
    _fn(IN, h, f"forms: {label} honeypot ignored", '  if (String(formData.get("company") ?? "").trim().length > 0) {\n    return { success: true, message: "Thank you!" };\n  }\n', "")
    _fn(IN, h, f"forms: {label} database text is not logged generically", '      message: "Something went wrong. Please try calling us directly.",', "      message: String(error.message),")
M += [
 ("forms: callers may send fifty an hour", IN, "caller: { limit: 5,", "caller: { limit: 50,"),
 ("forms: the site ceiling is a day", IN, "overall: { limit: 200, windowMs: 60 * 60 * 1000 }", "overall: { limit: 200, windowMs: 24 * 60 * 60 * 1000 }"),
 ("forms: the caller limit is ignored", IN, "  if (!caller.ok) return true;\n", ""),
 ("forms: the site ceiling is ignored", IN, '  return !(await durableRateLimit("inquiry-overall", "all", FORM_LIMITS.overall)).ok;', "  return false;"),
 ("forms: the address header is believed", IN, "const address = clientAddress(await headers());", 'const address = (await headers()).get("x-forwarded-for") ?? "x";'),
 ("forms: message not cleaned", IN, "    message: sanitizePlainText(parsed.data.message),\n    inquiry_type: parsed.data.inquiry_type,", "    message: parsed.data.message,\n    inquiry_type: parsed.data.inquiry_type,"),
 # --- the two routes
 ("api: inquiries not rate limited", AI, "  if (!limited.ok) {", "  if (false) {"),
 ("api: inquiries body limit lifted", AI, "const MAX_BODY_BYTES = 50_000;", "const MAX_BODY_BYTES = 500_000_000;"),
 ("api: a list is a body", AI, "  if (typeof body !== \"object\" || body === null || Array.isArray(body)) {", "  if (false) {"),
 ("api: location unbounded", AI, "          ? sanitizePlainText(location).slice(0, MAX_LOCATION) || null", "          ? sanitizePlainText(location) || null"),
 ("api: inquiries honeypot ignored", AI, '  if (typeof company === "string" && company.trim().length > 0) {', "  if (false) {"),
 ("api: inquiries trust the forwarded header", AI, "clientAddress(request.headers)", '(request.headers.get("x-forwarded-for") ?? "x")'),
 ("api: inquiries no Retry-After", AI, '{ status: 429, headers: { "Retry-After": String(Math.max(limited.retryAfter, 1)) } }', "{ status: 429 }"),
 ("api: search not rate limited", AS, "  if (!verdict.ok) {", "  if (false) {"),
 ("api: search limit lifted", AS, "const SEARCH_LIMIT = { limit: 90,", "const SEARCH_LIMIT = { limit: 90000,"),
 ("api: search trusts the forwarded header", AS, "clientAddress(request.headers)", '(request.headers.get("x-forwarded-for") ?? "x")'),
 ("api: search filter not quoted", AS, ".or(productSearchFilter(validated.data.q))", ".or(`name.ilike.%${validated.data.q}%`)"),
 ("api: unpublished products searchable", AS, 'price_range, category:product_categories(name, slug)")\n        .eq("is_published", true)', 'price_range, category:product_categories(name, slug)")'),
 ("api: unpublished projects searchable", AS, 'location, summary")\n        .eq("is_published", true)', 'location, summary")'),
 ("api: search query not validated", AS, "    if (!validated.success) {", "    if (false) {"),
]
