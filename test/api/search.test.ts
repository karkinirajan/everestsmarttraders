import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshFake, holder } from "../helpers/mocks";

vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: () => holder.fake }));

import { GET } from "@/app/api/search/route";
import { resetMemoryRateLimits } from "@/lib/rate-limit";

let fake: ReturnType<typeof freshFake>;
const search = (q: string | null, headers: Record<string, string> = {}) => GET(new Request(`http://localhost/api/search${q === null ? "" : `?q=${encodeURIComponent(q)}`}`, { headers }));

beforeEach(() => {
  fake = freshFake();
  resetMemoryRateLimits();
  delete process.env.VERCEL;
  delete process.env.TRUST_PROXY_HEADERS;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("GET /api/search", () => {
  it("returns empty lists, without asking the database, for no query, one character or unsupported characters", async () => {
    for (const q of [null, "", " ", "a", "<script>", 'a"b', "a_b", "x".repeat(81)]) {
      const response = await search(q);
      expect(await response.json()).toEqual({ products: [], projects: [] });
    }
    expect(fake.calls).toEqual([]);
  });
  it("searches published products and projects only, with the query quoted", async () => {
    fake.answer("products", { data: [{ id: "1", name: "Gate" }], error: null });
    fake.answer("projects", { data: [{ id: "2", title: "Hotel" }], error: null });
    const body = await (await search("smart, lock")).json();
    expect(body).toEqual({ products: [{ id: "1", name: "Gate" }], projects: [{ id: "2", title: "Hotel" }] });
    const [products, projects] = fake.calls;
    expect(products?.table).toBe("products");
    expect(projects?.table).toBe("projects");
    for (const call of fake.calls) {
      expect(call.filters).toContainEqual(["eq:is_published", true]);
    }
    expect(products?.filters).toContainEqual(["or:" + 'name.ilike."%smart, lock%",short_description.ilike."%smart, lock%"', undefined]);
  });
  it("cannot be given an extra filter condition through the query", async () => {
    await search("x,id.neq.0");
    const filter = (fake.calls[0]?.filters.find(([k]) => k.startsWith("or:")) as [string, unknown])[0];
    expect(filter).toBe('or:name.ilike."%x,id.neq.0%",short_description.ilike."%x,id.neq.0%"');
  });
  it("answers 429 with Retry-After after 90 searches a minute from one caller", async () => {
    for (let i = 0; i < 90; i++) expect((await search("gate")).status).toBe(200);
    const response = await search("gate");
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
  });
  it("does not let a caller escape the limit by sending a different X-Forwarded-For each time", async () => {
    for (let i = 0; i < 90; i++) await search("gate", { "x-forwarded-for": `10.0.0.${i}` });
    expect((await search("gate", { "x-forwarded-for": "10.9.9.9" })).status).toBe(429);
  });
  it("answers 500 with a fixed message when the database throws", async () => {
    fake.from = () => { throw new Error("secret-host refused"); };
    const response = await search("gate");
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret-host");
  });
});
