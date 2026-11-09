import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { inquiryOverLimit } from "@/lib/inquiry-limits";
import { PayloadTooLargeError, readTextLimited } from "@/lib/read-limited";
import {
  contactInquirySchema,
  sanitizePlainText,
} from "@/lib/validations/inquiry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API route for programmatic inquiry submission (e.g., from third-party integrations)
// The primary path for form submissions uses server actions in lib/actions/inquiry.ts

const MAX_BODY_BYTES = 50_000;
const MAX_LOCATION = 120;

export async function POST(request: Request) {
  // the same limits as the forms: this is another way into the same table, not a faster one
  if (await inquiryOverLimit(request.headers)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  let body: unknown;
  try {
    // the size is counted as the bytes arrive: Content-Length is only a claim, and a chunked request has none
    body = JSON.parse(await readTextLimited(request, MAX_BODY_BYTES));
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const {
    full_name,
    phone,
    email,
    subject,
    message,
    inquiry_type,
    location,
    company,
  } = body as Record<string, unknown>;

  if (typeof company === "string" && company.trim().length > 0) {
    return NextResponse.json({ success: true }, { status: 201 });
  }

  const parsed = contactInquirySchema.safeParse({
    full_name,
    phone,
    email,
    subject,
    message,
    inquiry_type,
    company: typeof company === "string" ? company : "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from("inquiries").insert({
      full_name: sanitizePlainText(parsed.data.full_name),
      phone: sanitizePlainText(parsed.data.phone),
      email: parsed.data.email || null,
      subject: sanitizePlainText(parsed.data.subject),
      message: sanitizePlainText(parsed.data.message),
      inquiry_type: parsed.data.inquiry_type,
      location:
        typeof location === "string"
          ? sanitizePlainText(location).slice(0, MAX_LOCATION) || null
          : null,
      status: "new",
    });

    if (error) {
      console.error("Inquiry API error");
      return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    console.error("Inquiry API error");
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
