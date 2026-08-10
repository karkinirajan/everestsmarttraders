"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminUpdate } from "@/lib/actions/admin-mutate";

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
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Focus first menu item when opened
  useEffect(() => {
    if (open && menuRef.current) {
      const firstButton = menuRef.current.querySelector<HTMLButtonElement>(
        "button:not([disabled])",
      );
      firstButton?.focus();
    }
  }, [open]);

  function handleStatusChange(status: string) {
    setOpen(false);
    triggerRef.current?.focus();
    startTransition(async () => {
      await adminUpdate("inquiries", inquiryId, {
        status,
        updated_at: new Date().toISOString(),
      });
      router.refresh();
    });
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="xs"
        onClick={() => setOpen(!open)}
        disabled={isPending}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`status-menu-${inquiryId}`}
        className="gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {isPending ? "Saving…" : "Status"}
        <ChevronDown className="size-3" aria-hidden="true" />
      </Button>
      {open && (
        <div
          id={`status-menu-${inquiryId}`}
          role="menu"
          aria-label="Change inquiry status"
          className="absolute right-0 top-full mt-1 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[8rem]"
        >
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              role="menuitem"
              onClick={() => handleStatusChange(status)}
              className={`flex h-auto w-full px-3 py-1.5 text-sm capitalize hover:bg-muted/60 transition-colors text-left ${
                status === currentStatus
                  ? "text-brand font-medium"
                  : "text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
