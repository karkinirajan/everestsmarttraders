import { z } from "zod";

const compact = (value: string) => value.replace(/\s+/g, " ").trim();

const compactedString = z.string().trim().transform(compact);

export const contactInquirySchema = z.object({
  full_name: compactedString.pipe(
    z.string().min(2, "Name must be at least 2 characters").max(120)
  ),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  phone: compactedString.pipe(z.string().min(7, "Phone number is required").max(30)),
  subject: compactedString.pipe(z.string().min(3, "Subject is required").max(160)),
  message: compactedString.pipe(
    z.string().min(10, "Message must be at least 10 characters").max(5000)
  ),
  inquiry_type: z.enum(["general", "quote", "support", "partnership"]).default("general"),
  company: compactedString.pipe(z.string().max(100)).optional().or(z.literal("")),
});

export const quoteInquirySchema = z.object({
  full_name: compactedString.pipe(z.string().min(2, "Name is required").max(120)),
  email: z
    .string()
    .trim()
    .email("Valid email required")
    .optional()
    .or(z.literal("")),
  phone: compactedString.pipe(z.string().min(7, "Phone number is required").max(30)),
  message: compactedString.pipe(
    z.string().min(10, "Please describe your requirements").max(5000)
  ),
  product_interest: compactedString.pipe(z.string().max(120)).optional().or(z.literal("")),
  location: compactedString.pipe(z.string().max(120)).optional().or(z.literal("")),
  company: compactedString.pipe(z.string().max(100)).optional().or(z.literal("")),
});

export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Query too short")
    .max(80, "Query too long")
    .regex(/^[\p{L}\p{N}\s\-.,()&+]+$/u, "Query contains unsupported characters"),
});

export function sanitizePlainText(value: string) {
  return value
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
}
