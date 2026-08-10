import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";
import { formatDate } from "@/lib/utils";

async function getBlogPosts() {
  await connection();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("blog_posts")
    .select(
      "id, title, slug, is_published, published_at, created_at, category:blog_categories(name)",
    )
    .order("created_at", { ascending: false });

  return data ?? [];
}

export default async function AdminBlogPage() {
  await connection();
  const posts = await getBlogPosts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tutorials</h1>
          <p className="text-muted-foreground mt-0.5">
            {posts.length} tutorials total
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/blog/new">
            <Plus className="size-4" />
            New Tutorial
          </Link>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Title
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                  Date
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <tr
                    key={post.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground line-clamp-1">
                        {post.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        /tutorials/{post.slug}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                      {(post.category as unknown as { name: string } | null)
                        ?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          post.is_published
                            ? "bg-success-muted text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {post.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {formatDate(post.published_at ?? post.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/blog/${post.id}`}>
                          <Pencil className="size-3.5" />
                          Edit
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No posts yet.{" "}
                    <Link
                      href="/admin/blog/new"
                      className="text-brand hover:underline"
                    >
                      Create one
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
