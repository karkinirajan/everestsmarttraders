import { headers } from "next/headers";
import { clientAddress } from "@/lib/client-address";
import { durableRateLimit } from "@/lib/rate-limit";

/**
 * The limits on creating an inquiry, shared by every way in (the two form actions and the inquiry API) so that none of them is a
 * weaker door to the same table: per caller, and for the whole site. The site ceiling only counts callers who are within their own
 * limit, so one flooder cannot use it up and lock real customers out.
 */
export const INQUIRY_LIMITS = {
  caller: { limit: 5, windowMs: 60 * 60 * 1000 },
  overall: { limit: 200, windowMs: 60 * 60 * 1000 },
} as const;

/** True when this request must be refused. Call it after the honeypot and before any work. */
export async function inquiryOverLimit(requestHeaders?: Headers): Promise<boolean> {
  const address = clientAddress(requestHeaders ?? (await headers()));
  const caller = await durableRateLimit("inquiry-caller", address, INQUIRY_LIMITS.caller);
  if (!caller.ok) return true;
  return !(await durableRateLimit("inquiry-overall", "all", INQUIRY_LIMITS.overall)).ok;
}
