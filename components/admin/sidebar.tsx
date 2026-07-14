"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  Wrench,
  Building2,
  Camera,
  FileText,
  Blocks,
  MessageSquare,
  Star,
  HelpCircle,
  Settings,
  Users,
  ImageIcon,
  LogOut,
  ChevronRight,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

interface SidebarProps {
  role: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
}

const navItems: { group: string; items: NavItem[] }[] = [
  {
    group: "Content",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: FolderOpen },
      { href: "/admin/services", label: "Services", icon: Wrench },
      { href: "/admin/industries", label: "Industries", icon: Building2 },
      { href: "/admin/projects", label: "Projects", icon: Camera },
      { href: "/admin/blog", label: "Tutorials", icon: FileText },
      { href: "/admin/content", label: "Content", icon: Blocks },
    ],
  },
  {
    group: "Customers",
    items: [
      { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
      { href: "/admin/testimonials", label: "Testimonials", icon: Star },
      { href: "/admin/faqs", label: "FAQs", icon: HelpCircle },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/admin/media", label: "Media", icon: ImageIcon },
      { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminSidebar({
  role,
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={cn(
        "w-60 shrink-0 bg-card border-r border-border flex flex-col h-screen overflow-y-auto z-30 transition-transform duration-200",
        // Mobile: fixed overlay panel, hidden by default
        "fixed lg:sticky lg:top-0 lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      {/* Brand */}
      <div className="px-4 py-5 border-b border-border">
        <Link href="/admin" className="flex items-center gap-2.5">
          <Image
            src="/images/brand-transparent.png"
            alt="Everest Smart Traders logo"
            width={32}
            height={32}
            className="size-8 rounded-lg object-contain bg-muted/60 p-1"
            priority
          />
          <div>
            <p className="text-[0.95rem] font-semibold text-foreground leading-tight">
              EST Admin
            </p>
            <p className="text-sm text-muted-foreground capitalize">{role}</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-6">
        {navItems.map((group) => (
          <div key={group.group}>
            <p className="text-[0.8rem] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-2">
              {group.group}
            </p>
            <ul className="space-y-0.5">
              {group.items
                .filter((item) => !item.adminOnly || role === "admin")
                .map(({ href, label, icon: Icon, exact }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[0.95rem] transition-colors group",
                      isActive(href, exact)
                        ? "bg-brand/15 text-brand font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {isActive(href, exact) && (
                      <ChevronRight className="size-3 text-brand" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[0.95rem] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors mb-1"
        >
          <ExternalLink className="size-4" />
          View Site
        </Link>
        <Button
          type="button"
          variant="ghost"
          onClick={handleSignOut}
          className="flex items-center justify-start gap-2.5 px-2.5 py-2 text-[0.95rem] text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full"
        >
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
