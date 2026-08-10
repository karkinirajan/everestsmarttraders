import Link from "next/link";
import {
  Package,
  MessageSquare,
  Camera,
  FileText,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";
import { formatDate } from "@/lib/utils";
import { INQUIRY_STATUS_STYLES } from "@/lib/constants";

async function getAdminStats() {
  await connection();
  const supabase = createAdminClient();

  const [
    productsRes,
    inquiriesRes,
    projectsRes,
    blogRes,
    recentInquiriesRes,
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
  ]);

  return {
    products: productsRes.count ?? 0,
    newInquiries: inquiriesRes.count ?? 0,
    projects: projectsRes.count ?? 0,
    blogPosts: blogRes.count ?? 0,
    recentInquiries: recentInquiriesRes.data ?? [],
  };
}

export default async function AdminDashboard() {
  await connection();
  const stats = await getAdminStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back. Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Published Products",
            value: stats.products,
            icon: Package,
            href: "/admin/products",
            color: "text-blue-500",
          },
          {
            label: "New Inquiries",
            value: stats.newInquiries,
            icon: MessageSquare,
            href: "/admin/inquiries",
            color: stats.newInquiries > 0 ? "text-amber-500" : "text-green-500",
            highlight: stats.newInquiries > 0,
          },
          {
            label: "Projects",
            value: stats.projects,
            icon: Camera,
            href: "/admin/projects",
            color: "text-purple-500",
          },
          {
            label: "Blog Posts",
            value: stats.blogPosts,
            icon: FileText,
            href: "/admin/blog",
            color: "text-teal-500",
          },
        ].map(({ label, value, icon: Icon, href, color, highlight }) => (
          <Link
            key={label}
            href={href}
            className={`group p-5 bg-card border rounded-xl hover:shadow-sm transition-all ${
              highlight ? "border-amber-500/30 bg-amber-500/5" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`flex size-10 items-center justify-center rounded-lg bg-muted ${color}`}>
                <Icon className="size-5" />
              </div>
              {highlight && <AlertCircle className="size-4 text-amber-500" />}
            </div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
          </Link>
        ))}
      </div>

      {/* Recent Inquiries */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Recent Inquiries</h2>
          <Link
            href="/admin/inquiries"
            className="flex items-center gap-1 text-sm text-brand hover:text-est-amber transition-colors"
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
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/40 transition-colors"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-semibold">
                  {inquiry.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {inquiry.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {inquiry.subject}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${INQUIRY_STATUS_STYLES[inquiry.status] ?? "bg-muted text-muted-foreground"}`}>
                    {inquiry.status}
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
            <CheckCircle2 className="size-8 mx-auto mb-2 text-green-500/50" />
            No new inquiries
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/admin/products/new", label: "Add Product", icon: Package },
            { href: "/admin/projects/new", label: "Add Project", icon: Camera },
            { href: "/admin/blog/new", label: "New Blog Post", icon: FileText },
            { href: "/admin/settings", label: "Site Settings", icon: TrendingUp },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-4 py-3 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:border-brand/30 hover:text-brand transition-all"
            >
              <Icon className="size-4 text-muted-foreground" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
