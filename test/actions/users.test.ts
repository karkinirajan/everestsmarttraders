import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshFake, holder } from "../helpers/mocks";

vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: () => holder.fake }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => holder.fake.sessionClient() }));

import { updateUserPassword } from "@/lib/actions/users";

const ID = "123e4567-e89b-42d3-a456-426614174000";
let fake: ReturnType<typeof freshFake>;
const prev = { success: false, message: "" };
const form = (fields: Record<string, string>) => { const fd = new FormData(); for (const [k, v] of Object.entries(fields)) fd.set(k, v); return fd; };
const GOOD = { user_id: ID, password: "correct horse", confirm_password: "correct horse" };

beforeEach(() => { fake = freshFake(); fake.auth.admin.updateUserById.mockClear(); });

describe("updateUserPassword", () => {
  it("refuses someone who is not signed in", async () => {
    expect(await updateUserPassword(prev, form(GOOD))).toEqual({ success: false, message: "Not signed in." });
    expect(fake.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
  it.each(["editor", "viewer", null])("refuses a %s: only an admin may change a password", async (role) => {
    fake.user = { id: "u1" };
    fake.profileRole = role;
    expect(await updateUserPassword(prev, form(GOOD))).toEqual({ success: false, message: "Only admins can change passwords." });
    expect(fake.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
  it("lets an admin set a password", async () => {
    fake.user = { id: "u1" };
    fake.profileRole = "admin";
    expect(await updateUserPassword(prev, form(GOOD))).toEqual({ success: true, message: "Password updated." });
    expect(fake.auth.admin.updateUserById).toHaveBeenCalledWith(ID, { password: "correct horse" });
  });
  it.each([
    ["a short password", { ...GOOD, password: "short", confirm_password: "short" }, /at least 8/],
    ["a password over 72 characters (bcrypt ignores the rest)", { ...GOOD, password: "x".repeat(73), confirm_password: "x".repeat(73) }, /at most 72/],
    ["a mismatch", { ...GOOD, confirm_password: "different one" }, /do not match/],
    ["an id that is not a uuid", { ...GOOD, user_id: "1 or 1=1" }, /./],
  ])("rejects %s before looking at the session", async (_name, fields, message) => {
    fake.user = { id: "u1" };
    fake.profileRole = "admin";
    const result = await updateUserPassword(prev, form(fields));
    expect(result.success).toBe(false);
    expect(result.message).toMatch(message);
    expect(fake.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
  it("does not repeat the auth service's error to the browser", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fake.user = { id: "u1" };
    fake.profileRole = "admin";
    fake.auth.admin.updateUserById.mockResolvedValueOnce({ error: { message: "User not found in tenant secret-tenant" } } as never);
    const result = await updateUserPassword(prev, form(GOOD));
    expect(result).toEqual({ success: false, message: "Failed to update password." });
  });
});
