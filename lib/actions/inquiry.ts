"use server";

import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { inquiryOverLimit } from "@/lib/inquiry-limits";
import {
  contactInquirySchema,
  quoteInquirySchema,
  sanitizePlainText,
} from "@/lib/validations/inquiry";

export type ContactFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[] | undefined>;
};

const TOO_MANY: ContactFormState = {
  success: false,
  message: "Too many requests. Please try again later, or call us directly.",
};

export async function submitContactInquiry(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  if (String(formData.get("company") ?? "").trim().length > 0) {
    return { success: true, message: "Thank you!" };
  }

  if (await inquiryOverLimit()) return TOO_MANY;

  const raw = {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    inquiry_type: formData.get("inquiry_type") ?? "general",
    company: formData.get("company") ?? "",
  };

  const parsed = contactInquirySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("inquiries").insert({
    full_name: sanitizePlainText(parsed.data.full_name),
    email: parsed.data.email || null,
    phone: sanitizePlainText(parsed.data.phone),
    subject: sanitizePlainText(parsed.data.subject),
    message: sanitizePlainText(parsed.data.message),
    inquiry_type: parsed.data.inquiry_type,
    status: "new",
  });

  if (error) {
    console.error("Inquiry insert error:", error);
    return {
      success: false,
      message: "Something went wrong. Please try calling us directly.",
    };
  }

  revalidateTag("inquiries", "default");

  return {
    success: true,
    message: "Thank you! We'll get back to you within 24 hours.",
  };
}

export async function submitQuoteRequest(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  if (String(formData.get("company") ?? "").trim().length > 0) {
    return { success: true, message: "Thank you!" };
  }

  if (await inquiryOverLimit()) return TOO_MANY;

  const raw = {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message"),
    product_interest: formData.get("product_interest"),
    location: formData.get("location"),
    company: formData.get("company") ?? "",
  };

  const parsed = quoteInquirySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("inquiries").insert({
    full_name: sanitizePlainText(parsed.data.full_name),
    email: parsed.data.email || null,
    phone: sanitizePlainText(parsed.data.phone),
    subject:
      "Quote Request" +
      (parsed.data.product_interest ? `: ${sanitizePlainText(parsed.data.product_interest)}` : ""),
    message: sanitizePlainText(parsed.data.message),
    location: parsed.data.location ? sanitizePlainText(parsed.data.location) : null,
    inquiry_type: "quote",
    status: "new",
  });

  if (error) {
    console.error("Quote insert error:", error);
    return {
      success: false,
      message: "Something went wrong. Please try calling us directly.",
    };
  }

  revalidateTag("inquiries", "default");

  return {
    success: true,
    message: "Quote request received! We'll send you a detailed quote within 24 hours.",
  };
}
