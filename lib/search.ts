/**
 * The two PostgREST `or=` filters for the public search box.
 *
 * The text goes into a filter *string*, in which "," separates conditions and "(" ")" group them, so an unquoted query such as
 * `x,id.neq.0` would add a condition of the caller's own. The pattern is wrapped in double quotes (PostgREST then reads it as one
 * value) and any quote or backslash in it is escaped; LIKE wildcards typed by the caller are escaped too, so they match
 * themselves.
 */
export function likePattern(query: string): string {
  const escaped = query.replace(/[\\%_]/g, (c) => `\\${c}`);
  const quoted = escaped.replace(/["\\]/g, (c) => `\\${c}`);
  return `"%${quoted}%"`;
}

export function productSearchFilter(query: string): string {
  const p = likePattern(query);
  return `name.ilike.${p},short_description.ilike.${p}`;
}

export function projectSearchFilter(query: string): string {
  const p = likePattern(query);
  return `title.ilike.${p},summary.ilike.${p},location.ilike.${p}`;
}
