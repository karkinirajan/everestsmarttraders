import sanitizeHtml from "sanitize-html";

/**
 * HTML written in the admin (blog posts, tutorials, product descriptions) is rendered with dangerouslySetInnerHTML on the public
 * site, so whatever an admin or editor saves is run in every visitor's browser. It is cleaned here, with an HTML parser and an
 * allow-list: what is not listed is dropped. (This replaces a chain of regular expressions, which cannot parse HTML: for
 * example `<a href=javascript:alert(1)>` with no quotes, `<img/src=x/onerror=...>` with slashes for spaces and entity-encoded
 * schemes all got through it.)
 *
 * Server-only: sanitize-html pulls in Node packages, so it lives apart from lib/utils.ts, which client components import.
 */
const URL_SCHEMES = ["http", "https", "mailto", "tel"];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr", "blockquote", "pre", "code",
    "ul", "ol", "li",
    "strong", "b", "em", "i", "u", "s", "sub", "sup", "small", "mark",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: URL_SCHEMES,
  // pictures are fetched, not followed: no data:, no mailto:
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  // script, style, textarea, option and the like lose their text as well as their tags
  disallowedTagsMode: "discard",
  transformTags: {
    a: (tagName, attribs) => {
      const next = { ...attribs };
      if (next.target === "_blank") next.rel = "noopener noreferrer";
      else delete next.target;
      return { tagName, attribs: next };
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } }),
  },
};

/** Returns HTML that is safe to render: only allow-listed tags and attributes, only http(s)/mailto/tel links. */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS);
}

/** For dangerouslySetInnerHTML: `<div dangerouslySetInnerHTML={dangerousHtml(post.content)} />`. */
export function dangerousHtml(html: string | null | undefined) {
  return { __html: sanitizeRichHtml(html) };
}
