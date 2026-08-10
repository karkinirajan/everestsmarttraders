import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";
import { formatDate } from "@/lib/utils";
import { INQUIRY_STATUS_LABELS, INQUIRY_STATUS_STYLES } from "@/lib/constants";
import { InquiryActions } from "../inquiry-actions";

interface Props {
  params: Promise<{ id: string }>;
}

async function getInquiry(id: string) {
  await connection();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("inquiries")
    .select("*")
    .eq("id", id)
    .single();

  return data ?? null;
}

export default async function InquiryDetailPage({ params }: Props) {
  const { id } = await params;
  const inquiry = await getInquiry(id);

  if (!inquiry) notFound();

  const statusLabel = INQUIRY_STATUS_LABELS[inquiry.status] ?? inquiry.status;
  const statusClass = INQUIRY_STATUS_STYLES[inquiry.status] ?? "bg-muted text-muted-foreground";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/inquiries"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="size-4" />
            All Inquiries
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            {inquiry.full_name}
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusClass}`}
            >
              {statusLabel}
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              {inquiry.inquiry_type} inquiry
            </span>
          </div>
        </div>
        <InquiryActions
          inquiryId={inquiry.id}
          currentStatus={inquiry.status}
        />
      </div>

      {/* Contact details */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">
          Contact Details
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
              <User className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Name</p>
              <p className="text-sm font-medium text-foreground">
                {inquiry.full_name}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
              <Phone className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
              <a
                href={`tel:${inquiry.phone}`}
                className="text-sm font-medium text-foreground hover:text-brand transition-colors"
              >
                {inquiry.phone}
              </a>
            </div>
          </div>

          {inquiry.email && (
            <div className="flex items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
                <Mail className="size-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                <a
                  href={`mailto:${inquiry.email}`}
                  className="text-sm font-medium text-foreground hover:text-brand transition-colors break-all"
                >
                  {inquiry.email}
                </a>
              </div>
            </div>
          )}

          {inquiry.company && (
            <div className="flex items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
                <User className="size-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Company</p>
                <p className="text-sm font-medium text-foreground">
                  {inquiry.company}
                </p>
              </div>
            </div>
          )}

          {inquiry.location && (
            <div className="flex items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
                <MapPin className="size-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  Location
                </p>
                <p className="text-sm font-medium text-foreground">
                  {inquiry.location}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
              <Calendar className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Received</p>
              <p className="text-sm font-medium text-foreground">
                {formatDate(inquiry.created_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subject & Message */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">
          Message
        </h2>
        {inquiry.subject && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Subject</p>
            <p className="text-sm font-medium text-foreground">
              {inquiry.subject}
            </p>
          </div>
        )}
        {inquiry.message && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Message</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {inquiry.message}
            </p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        {inquiry.phone && (
          <Button asChild variant="default" size="sm">
            <a href={`tel:${inquiry.phone}`}>
              <Phone className="size-4" />
              Call {inquiry.phone}
            </a>
          </Button>
        )}
        {inquiry.email && (
          <Button asChild variant="outline" size="sm">
            <a href={`mailto:${inquiry.email}`}>
              <Mail className="size-4" />
              Email
            </a>
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <a
            href={`https://wa.me/977${inquiry.phone?.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        </Button>
      </div>

      {/* Metadata */}
      {inquiry.ip_address && (
        <div className="text-xs text-muted-foreground">
          Submitted from IP: {inquiry.ip_address}
        </div>
      )}
    </div>
  );
}
