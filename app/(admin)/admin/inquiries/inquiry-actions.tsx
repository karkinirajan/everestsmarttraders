"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { adminUpdate } from "@/lib/actions/admin-mutate";
import { INQUIRY_STATUS_LABELS } from "@/lib/constants";

const statuses = ["new", "contacted", "quoted", "closed", "spam"] as const;

interface InquiryActionsProps {
  inquiryId: string;
  currentStatus: string;
}

export function InquiryActions({
  inquiryId,
  currentStatus,
}: InquiryActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleStatusChange(nextStatus: string) {
    if (nextStatus === currentStatus) return;
    setError(null);
    startTransition(async () => {
      const res = await adminUpdate("inquiries", inquiryId, {
        status: nextStatus,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="relative inline-flex items-center">
        <select
          aria-label="Change inquiry status"
          value={currentStatus}
          disabled={isPending}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-7 rounded-md border border-input bg-field px-2.5 pr-6 text-xs font-medium text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50 cursor-pointer"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {INQUIRY_STATUS_LABELS[status] ?? status}
            </option>
          ))}
        </select>
        {isPending && (
          <Loader2
            className="size-3 animate-spin text-muted-foreground absolute right-1.5 pointer-events-none"
            aria-hidden="true"
          />
        )}
      </div>
      {error && (
        <span
          role="alert"
          className="text-xs text-destructive max-w-36 truncate"
          title={error}
        >
          {error}
        </span>
      )}
    </div>
  );
}
