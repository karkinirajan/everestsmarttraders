import Link from "next/link";
import { Eye, Phone, Mail } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";
import { formatDate } from "@/lib/utils";
import { INQUIRY_STATUS_LABELS, INQUIRY_STATUS_STYLES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteItemButton } from "@/components/admin/delete-item-button";
import { InquiryActions } from "./inquiry-actions";

async function getInquiries() {
  await connection();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}

export default async function InquiriesPage() {
  await connection();
  const inquiries = await getInquiries();
  const newCount = inquiries.filter((i) => i.status === "new").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inquiries</h1>
          <p className="text-muted-foreground mt-0.5">
            {newCount > 0 ? (
              <span className="text-est-amber font-medium">{newCount} new</span>
            ) : (
              "All up to date"
            )}{" "}
            · {inquiries.length} total
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead className="hidden sm:table-cell">Subject</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inquiries.length > 0 ? (
              inquiries.map((inquiry) => {
                const statusLabel =
                  INQUIRY_STATUS_LABELS[inquiry.status] ?? inquiry.status;
                const statusClass =
                  INQUIRY_STATUS_STYLES[inquiry.status] ??
                  "bg-muted text-muted-foreground";
                return (
                  <TableRow key={inquiry.id}>
                    <TableCell>
                      <Link
                        href={`/admin/inquiries/${inquiry.id}`}
                        className="font-medium text-foreground hover:text-brand transition-colors block"
                      >
                        {inquiry.full_name}
                      </Link>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        <a
                          href={`tel:${inquiry.phone}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand transition-colors"
                        >
                          <Phone className="size-3 shrink-0" /> {inquiry.phone}
                        </a>
                        {inquiry.email && (
                          <a
                            href={`mailto:${inquiry.email}`}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand transition-colors break-all"
                          >
                            <Mail className="size-3 shrink-0" /> {inquiry.email}
                          </a>
                        )}
                      </div>
                      {/* Stacked mobile summary when columns are hidden */}
                      <div className="sm:hidden mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                        {inquiry.subject && (
                          <p className="line-clamp-1 text-foreground/85">
                            {inquiry.subject}
                          </p>
                        )}
                        <p className="capitalize">
                          {inquiry.inquiry_type} · {formatDate(inquiry.created_at)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell max-w-[240px]">
                      <Link
                        href={`/admin/inquiries/${inquiry.id}`}
                        className="truncate block hover:text-foreground transition-colors"
                        title={inquiry.subject ?? undefined}
                      >
                        {inquiry.subject || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs capitalize text-muted-foreground">
                        {inquiry.inquiry_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-md font-medium ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                      {formatDate(inquiry.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                        <InquiryActions
                          inquiryId={inquiry.id}
                          currentStatus={inquiry.status}
                        />
                        <Button asChild variant="ghost" size="xs">
                          <Link
                            href={`/admin/inquiries/${inquiry.id}`}
                            aria-label={`View inquiry from ${inquiry.full_name}`}
                          >
                            <Eye className="size-3.5" />
                            <span className="hidden xl:inline">View</span>
                          </Link>
                        </Button>
                        <DeleteItemButton
                          table="inquiries"
                          id={inquiry.id}
                          label={`inquiry from ${inquiry.full_name}`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  No inquiries yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
