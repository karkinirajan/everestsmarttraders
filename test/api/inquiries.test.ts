import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshFake, holder } from "../helpers/mocks";

vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: () => holder.fake }));

import { POST } from "@/app/api/inquiries/route";
import { limiterKey, resetMemoryRateLimits, resetRateLimitWarning } from "@/lib/rate-limit";

let fake: ReturnType<typeof freshFake>;
const VALID = { full_name: "Sita Sharma", phone: "9800000000", email: "sita@example.com", subject: "Gate motor", message: "I would like a gate motor installed.", inquiry_type: "general", location: "Kathmandu" };
const send = (body: unknown, headers: Record<string, string> = {}) =>
  POST(new Request("http://localhost/api/inquiries", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }));

beforeEach(() => {
  fake = freshFake();
  resetMemoryRateLimits();
  resetRateLimitWarning();
  delete process.env.VERCEL;
  delete process.env.TRUST_PROXY_HEADERS;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/inquiries", () => {
  it("stores a valid inquiry and answers 201", async () => {
    const response = await send(VALID);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true });
    expect(fake.calls[0]).toMatchObject({ table: "inquiries", op: "insert", payload: { full_name: "Sita Sharma", status: "new", location: "Kathmandu" } });
  });

  it("uses the same limits as the forms: the caller (5 an hour), then the whole site (200 an hour)", async () => {
    await send(VALID);
    expect(fake.rpcCalls.map((c) => c.args)).toEqual([
      { p_key: limiterKey("inquiry-caller", "untrusted"), p_window_seconds: 3600 },
      { p_key: limiterKey("inquiry-overall", "all"), p_window_seconds: 3600 },
    ]);
  });
  it("answers 429 with Retry-After when the caller is over the limit, and stores nothing", async () => {
    fake.rpcAnswer = { data: 6, error: null };
    const response = await send(VALID);
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expect(fake.calls).toEqual([]);
    expect(fake.rpcCalls).toHaveLength(1);
  });
  it("answers 429 when the whole site is over its ceiling", async () => {
    fake.rpcQueue = [{ data: 1, error: null }, { data: 201, error: null }];
    expect((await send(VALID)).status).toBe(429);
    expect(fake.calls).toEqual([]);
  });
  it("allows exactly five from one caller", async () => {
    fake.rpcAnswer = { data: 5, error: null };
    expect((await send(VALID)).status).toBe(201);
  });
  it("does not let a caller pick their rate-limit key with a header", async () => {
    await send(VALID, { "x-forwarded-for": "1.1.1.1" });
    await send(VALID, { "x-forwarded-for": "2.2.2.2" });
    const callerKeys = fake.rpcCalls.map((c) => (c.args as { p_key: string }).p_key).filter((k) => k.startsWith("inquiry-caller:"));
    expect(callerKeys).toHaveLength(2);
    expect(new Set(callerKeys).size).toBe(1);
  });
  it("uses the real address on Vercel", async () => {
    process.env.VERCEL = "1";
    await send(VALID, { "x-forwarded-for": "203.0.113.9" });
    expect((fake.rpcCalls[0]?.args as { p_key: string }).p_key).toBe(limiterKey("inquiry-caller", "203.0.113.9"));
  });

  it("refuses a body that claims to be too big", async () => {
    const response = await send(VALID, { "content-length": "60000" });
    expect(response.status).toBe(413);
    expect(fake.calls).toEqual([]);
  });
  it("refuses a body that really is too big even with no Content-Length (chunked)", async () => {
    const stream = new ReadableStream<Uint8Array>({ start(c) { for (let i = 0; i < 12; i++) c.enqueue(new TextEncoder().encode("x".repeat(5_000))); c.close(); } });
    const request = new Request("http://localhost/api/inquiries", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    expect((await POST(request)).status).toBe(413);
    expect(fake.calls).toEqual([]);
  });
  it.each(["not json", "", "[1,2]", "null", '"text"', "7"])("answers 400 for the body %j", async (body) => {
    expect((await send(body)).status).toBe(400);
  });
  it("answers 400 with the field errors for invalid input", async () => {
    const response = await send({ ...VALID, full_name: "x", message: "short" });
    expect(response.status).toBe(400);
    expect(Object.keys((await response.json()).details)).toEqual(expect.arrayContaining(["full_name", "message"]));
  });
  it("accepts and discards a bot that filled the hidden field", async () => {
    const response = await send({ ...VALID, company: "Spam" });
    expect(response.status).toBe(201);
    expect(fake.calls).toEqual([]);
  });
  it("cuts an over-long location to 120 characters, and stores null for an empty one", async () => {
    await send({ ...VALID, location: "L".repeat(5_000) });
    expect(((fake.calls[0]?.payload as { location: string }).location).length).toBe(120);
    fake.calls.length = 0;
    await send({ ...VALID, location: "<>" });
    expect((fake.calls[0]?.payload as { location: unknown }).location).toBeNull();
  });
  it("answers 500 with a fixed message when the database fails, not its text", async () => {
    fake.setDefault({ data: null, error: { code: "XX000", message: "secret-host refused" } });
    const response = await send(VALID);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret-host");
  });
});
