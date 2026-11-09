"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminHeaderProps {
  user: { email: string; name: string | null };
  onMenuClick?: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  products: "Products",
  categories: "Categories",
  services: "Services",
  industries: "Industries",
  projects: "Projects",
  blog: "Tutorials",
  content: "Site Content",
  inquiries: "Inquiries",
  testimonials: "Testimonials",
  faqs: "FAQs",
  media: "Media Library",
  users: "Users & Roles",
  settings: "Settings",
  new: "New",
};

export function AdminHeader({ user, onMenuClick }: AdminHeaderProps) {
  const pathname = usePathname();
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .slice(1); // drop leading "admin"

  const sectionSlug = segments[0];
  const sectionLabel = sectionSlug
    ? (SECTION_LABELS[sectionSlug] ?? sectionSlug.replace(/-/g, " "))
    : null;
  const subSegment = segments[1];
  const subLabel =
    subSegment === "new"
      ? "Create"
      : subSegment
        ? "Details"
        : null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email.charAt(0).toUpperCase();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6 shrink-0">
      <nav
        aria-label="Admin breadcrumb"
        className="flex items-center gap-2 text-sm text-muted-foreground min-w-0"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="lg:hidden text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
        >
          <Menu className="size-5" />
        </Button>
        <Link
          href="/admin"
          className={
            sectionLabel
              ? "hover:text-foreground transition-colors shrink-0"
              : "text-foreground font-medium shrink-0"
          }
        >
          Dashboard
        </Link>
        {sectionLabel && (
          <>
            <ChevronRight className="size-3.5 text-muted-foreground/70 shrink-0" aria-hidden="true" />
            {subLabel ? (
              <Link
                href={`/admin/${sectionSlug}`}
                className="hover:text-foreground transition-colors capitalize truncate"
              >
                {sectionLabel}
              </Link>
            ) : (
              <span className="text-foreground font-medium capitalize truncate">
                {sectionLabel}
              </span>
            )}
          </>
        )}
        {subLabel && (
          <>
            <ChevronRight className="size-3.5 text-muted-foreground/70 shrink-0" aria-hidden="true" />
            <span className="text-foreground font-medium truncate">
              {subLabel}
            </span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href="/admin/inquiries" aria-label="View customer inquiries">
            <Bell className="size-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-8 items-center justify-center rounded-full bg-brand-muted text-brand border border-brand/25 text-xs font-semibold"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-foreground leading-tight max-w-44 truncate">
              {user.name ?? user.email}
            </p>
            {user.name && (
              <p className="text-xs text-muted-foreground leading-tight max-w-44 truncate">
                {user.email}
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
