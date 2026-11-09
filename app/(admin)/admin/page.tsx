import Link from "next/link";
import {
  Package,
  MessageSquare,
  Camera,
  FileText,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Activity,
  FolderOpen,
  Wrench,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { ensureDailyHeartbeat } from "@/lib/keepalive";
import { connection } from "next/server";
import { formatDate } from "@/lib/utils";
import { INQUIRY_STATUS_STYLES, INQUIRY_STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

async function getAdminStats() {
  await connection();
  const supabase = createAdminClient();

  const [
    productsRes,
    inquiriesRes,
    projectsRes,
    blogRes,
    recentInquiriesRes,
    heartbeatResult,
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase
      .from("inquiries")
      .select("id, full_name, phone, subject, status, inquiry_type, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    ensureDailyHeartbeat("admin-dashboard"),
  ]);

  return {
    products: productsRes.count ?? 0,
    newInquiries: inquiriesRes.count ?? 0,
    projects: projectsRes.count ?? 0,
    blogPosts: blogRes.count ?? 0,
    recentInquiries: recentInquiriesRes.data ?? [],
    heartbeat: heartbeatResult,
  };
}

export default async function AdminDashboard() {
  await connection();
  const stats = await getAdminStats();

  const statCards = [
    {
      label: "Published Products",
      value: stats.products,
      icon: Package,
      href: "/admin/products",
      iconStyle: "bg-info-muted text-info",
      highlight: false,
    },
    {
      label: "New Inquiries",
      value: stats.newInquiries,
      icon: MessageSquare,
      href: "/admin/inquiries",
      iconStyle:
        stats.newInquiries > 0
          ? "bg-warning-muted text-warning"
          : "bg-success-muted text-success",
      highlight: stats.newInquiries > 0,
    },
    {
      label: "Published Projects",
      value: stats.projects,
      icon: Camera,
      href: "/admin/projects",
      iconStyle: "bg-violet-muted text-violet",
      highlight: false,
    },
    {
      label: "Published Tutorials",
      value: stats.blogPosts,
      icon: FileText,
      href: "/admin/blog",
      iconStyle: "bg-success-muted text-success",
      highlight: false,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back. Manage products, content, and customer inquiries.
          </p>
        </div>
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-card border border-border text-xs">
          <span
            className={`size-2 rounded-full shrink-0 ${
              stats.heartbeat.ok ? "bg-success" : "bg-warning"
            }`}
            aria-hidden="true"
          />
          <Activity className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="text-muted-foreground">
            DB Keep-Alive:{" "}
            <strong className="text-foreground font-medium">
              {stats.heartbeat.ok
                ? `Active (${stats.heartbeat.day})`
                : "Degraded"}
            </strong>
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, href, iconStyle, highlight }) => (
          <Link
            key={label}
            href={href}
            className={`group p-5 bg-card border rounded-xl hover:border-brand/40 transition-all ${
              highlight
                ? "border-warning/40 bg-warning-muted/20"
                : "border-border"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`flex size-10 items-center justify-center rounded-lg ${iconStyle}`}
              >
                <Icon className="size-5" />
              </div>
              {highlight && (
                <Badge variant="warning">
                  <AlertCircle className="size-3" />
                  Needs review
                </Badge>
              )}
            </div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-sm text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors">
              {label}
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Inquiries */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">Recent Inquiries</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest customer messages and quote requests
            </p>
          </div>
          <Link
            href="/admin/inquiries"
            className="flex items-center gap-1 text-sm font-medium text-brand hover:underline transition-colors"
          >
            View all <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {stats.recentInquiries.length > 0 ? (
          <div className="divide-y divide-border">
            {stats.recentInquiries.map((inquiry) => (
              <Link
                key={inquiry.id}
                href={`/admin/inquiries/${inquiry.id}`}
                className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 hover:bg-muted/35 transition-colors"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-muted text-brand border border-brand/25 text-xs font-semibold">
                  {inquiry.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight truncate">
                    {inquiry.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {inquiry.subject}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-md font-medium capitalize ${
                      INQUIRY_STATUS_STYLES[inquiry.status] ??
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    {INQUIRY_STATUS_LABELS[inquiry.status] ?? inquiry.status}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {formatDate(inquiry.created_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-muted-foreground text-sm">
            <CheckCircle2 className="size-8 mx-auto mb-2 text-success" />
            No customer inquiries yet
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { href: "/admin/products/new", label: "Add Product", icon: Package },
            { href: "/admin/categories/new", label: "Add Category", icon: FolderOpen },
            { href: "/admin/services/new", label: "Add Service", icon: Wrench },
            { href: "/admin/projects/new", label: "Add Project", icon: Camera },
            { href: "/admin/blog/new", label: "New Tutorial", icon: FileText },
            { href: "/admin/settings", label: "Site Settings", icon: TrendingUp },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3.5 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:border-brand/40 hover:bg-muted/30 transition-all"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-brand-muted text-brand">
                <Icon className="size-4" />
              </div>
              <span>{label}</span>
              <ArrowRight className="size-3.5 ml-auto text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
