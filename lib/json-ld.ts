/**
 * JSON for a <script type="application/ld+json"> block. JSON.stringify leaves "<" as it is, so a value containing
 * "</script><script>..." (an FAQ answer written in the admin, say) would end the block and start a script of the writer's
 * choosing. "<" and the two line separators are escaped as \uXXXX, which JSON parsers read back to the same text.
 */
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

export function jsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replaceAll(LINE_SEPARATOR, "\\u2028")
    .replaceAll(PARAGRAPH_SEPARATOR, "\\u2029");
}
