import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshFake, holder } from "../helpers/mocks";

vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: () => holder.fake }));
const cache = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock("next/cache", () => cache);
vi.mock("next/headers", () => ({ headers: async () => holder.headers }));

import { submitContactInquiry, submitQuoteRequest } from "@/lib/actions/inquiry";
import { limiterKey, resetMemoryRateLimits, resetRateLimitWarning } from "@/lib/rate-limit";

let fake: ReturnType<typeof freshFake>;
const empty = { success: false, message: "" };
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};
const CONTACT = { full_name: "Sita Sharma", email: "sita@example.com", phone: "9800000000", subject: "Gate motor", message: "I would like a gate motor installed.", inquiry_type: "general", company: "" };
const QUOTE = { full_name: "Ram Thapa", email: "", phone: "9811111111", message: "Quote for two shutters please.", product_interest: "Rolling shutter", location: "Pokhara", company: "" };

beforeEach(() => {
  fake = freshFake();
  cache.revalidateTag.mockReset();
  resetMemoryRateLimits();
  resetRateLimitWarning();
  delete process.env.VERCEL;
  delete process.env.TRUST_PROXY_HEADERS;
});

describe.each([
  ["contact", submitContactInquiry, CONTACT, "Thank you!"],
  ["quote", submitQuoteRequest, QUOTE, "Quote request received!"],
] as const)("%s form", (_name, action, valid, okText) => {
  it("stores a valid message and says thanks", async () => {
    const result = await action(empty, form(valid));
    expect(result.success).toBe(true);
    expect(result.message).toContain(okText.replace("!", ""));
    expect(fake.calls.filter((c) => c.op === "insert")).toHaveLength(1);
    expect(fake.calls.find((c) => c.op === "insert")?.table).toBe("inquiries");
    expect(cache.revalidateTag).toHaveBeenCalledWith("inquiries", "default");
  });

  it("silently accepts and discards a bot that filled the hidden field, without counting it or storing it", async () => {
    const result = await action(empty, form({ ...valid, company: "Spam Inc" }));
    expect(result).toEqual({ success: true, message: "Thank you!" });
    expect(fake.calls).toEqual([]);
    expect(fake.rpcCalls).toEqual([]);
  });

  it("counts the caller (hashed address) and then the whole site, each over an hour", async () => {
    await action(empty, form(valid));
    expect(fake.rpcCalls.map((c) => c.args)).toEqual([
      { p_key: limiterKey("inquiry-caller", "untrusted"), p_window_seconds: 3600 },
      { p_key: limiterKey("inquiry-overall", "all"), p_window_seconds: 3600 },
    ]);
  });

  it("refuses the sixth message from one caller in an hour and stores nothing", async () => {
    fake.rpcAnswer = { data: 6, error: null };
    const result = await action(empty, form(valid));
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Too many requests/);
    expect(fake.calls).toEqual([]);
    expect(fake.rpcCalls).toHaveLength(1); // the overall ceiling was not touched by a caller who is already over their own limit
  });

  it("accepts exactly five from one caller", async () => {
    fake.rpcAnswer = { data: 5, error: null };
    expect((await action(empty, form(valid))).success).toBe(true);
  });

  it("refuses when the whole site is over its hourly ceiling", async () => {
    fake.rpcQueue = [{ data: 1, error: null }, { data: 201, error: null }];
    const result = await action(empty, form(valid));
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Too many requests/);
    expect(fake.calls).toEqual([]);
  });

  it("takes the caller's address from X-Forwarded-For only when that header is trusted", async () => {
    holder.headers = new Headers({ "x-forwarded-for": "203.0.113.9" });
    await action(empty, form(valid));
    expect(fake.rpcCalls[0]?.args).toMatchObject({ p_key: limiterKey("inquiry-caller", "untrusted") });
    process.env.VERCEL = "1";
    await action(empty, form(valid));
    expect(fake.rpcCalls[2]?.args).toMatchObject({ p_key: limiterKey("inquiry-caller", "203.0.113.9") });
  });

  it("returns field errors for invalid input, and stores nothing", async () => {
    const result = await action(empty, form({ ...valid, full_name: "x", phone: "1" }));
    expect(result.success).toBe(false);
    expect(Object.keys(result.errors ?? {})).toEqual(expect.arrayContaining(["full_name", "phone"]));
    expect(fake.calls).toEqual([]);
  });

  it("tells the visitor to phone when the database fails, without the database's words", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fake.setDefault({ data: null, error: { code: "XX000", message: "connection to secret-host failed" } });
    const result = await action(empty, form(valid));
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/calling us directly/);
    expect(JSON.stringify(result)).not.toContain("secret-host");
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });
});

describe("what is stored", () => {
  it("strips angle brackets and control characters from every free-text field", async () => {
    await submitContactInquiry(empty, form({ ...CONTACT, full_name: "Sita <b>Sharma</b>", subject: "Hi\u0007 there", message: "Please <script>alert(1)</script> call me back" }));
    const row = fake.calls.find((c) => c.op === "insert")?.payload as Record<string, string>;
    expect(row.full_name).toBe("Sita bSharma/b");
    expect(row.subject).toBe("Hi there");
    expect(row.message).not.toMatch(/[<>]/);
    expect(row.status).toBe("new");
  });
  it("stores a quote with its product and place in the subject and location", async () => {
    await submitQuoteRequest(empty, form(QUOTE));
    const row = fake.calls.find((c) => c.op === "insert")?.payload as Record<string, string | null>;
    expect(row.subject).toBe("Quote Request: Rolling shutter");
    expect(row.location).toBe("Pokhara");
    expect(row.inquiry_type).toBe("quote");
    expect(row.email).toBeNull();
  });
});
