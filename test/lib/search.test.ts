import { describe, expect, it } from "vitest";
import { likePattern, productSearchFilter, projectSearchFilter } from "@/lib/search";
import { searchQuerySchema } from "@/lib/validations/inquiry";

describe("likePattern", () => {
  it("wraps in % and quotes", () => expect(likePattern("gate")).toBe('"%gate%"'));
  it("keeps a comma and parentheses inside the quoted value, where they are text", () => expect(likePattern("a,b(c)")).toBe('"%a,b(c)%"'));
  it("escapes quotes and backslashes", () => expect(likePattern('a"b\\c')).toBe('"%a\\"b\\\\\\\\c%"'.replace(/\\\\\\\\/, "\\\\\\\\")));
  it("escapes LIKE wildcards typed by the caller", () => {
    expect(likePattern("100%")).toBe('"%100\\\\%%"');
    expect(likePattern("a_b")).toBe('"%a\\\\_b%"');
  });
});

describe("the filters", () => {
  it("search the right columns", () => {
    expect(productSearchFilter("lock")).toBe('name.ilike."%lock%",short_description.ilike."%lock%"');
    expect(projectSearchFilter("lock")).toBe('title.ilike."%lock%",summary.ilike."%lock%",location.ilike."%lock%"');
  });

  it("cannot be given an extra condition by the query text (the filter string has exactly the conditions we wrote)", () => {
    for (const evil of ["x,is_published.eq.false", "x),(id.neq.0", "x%,id.neq.0,name.ilike.%", 'x",id.neq.0,name.ilike."']) {
      const filter = productSearchFilter(evil);
      // every comma that separates conditions is outside the quotes: strip the quoted values and exactly one separator remains
      const outsideQuotes = filter.replace(/"(?:[^"\\]|\\.)*"/g, '""');
      expect(outsideQuotes).toBe('name.ilike.""' + ',short_description.ilike.""');
    }
  });

  it("is only ever given text the schema allows (no quotes, no backslashes, no % or _)", () => {
    for (const bad of ['a"b', "a\\b", "a%b", "a_b", "<script>", "a;b"]) expect(searchQuerySchema.safeParse({ q: bad }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: "smart lock (digital), 2-pack & more" }).success).toBe(true);
  });
});
