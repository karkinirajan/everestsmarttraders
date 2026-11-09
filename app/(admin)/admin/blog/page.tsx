import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteItemButton } from "@/components/admin/delete-item-button";
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tutorials</h1>
          <p className="text-muted-foreground mt-0.5">
            {posts.length} tutorials total
          </p>
        </div>
        <Button asChild size="sm" className="self-start sm:self-auto">
          <Link href="/admin/blog/new">
            <Plus className="size-4" />
            New Tutorial
          </Link>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length > 0 ? (
              posts.map((post) => {
                const categoryName =
                  (post.category as unknown as { name: string } | null)?.name ??
                  null;
                return (
                  <TableRow key={post.id}>
                    <TableCell>
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="font-medium text-foreground hover:text-brand transition-colors line-clamp-1"
                      >
                        {post.title}
                      </Link>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        /tutorials/{post.slug}
                      </p>
                      <p className="lg:hidden text-xs text-muted-foreground mt-0.5">
                        {categoryName ? `${categoryName} · ` : ""}
                        {formatDate(post.published_at ?? post.created_at)}
                      </p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {categoryName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={post.is_published ? "success" : "muted"}>
                        {post.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(post.published_at ?? post.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="xs">
                          <Link href={`/admin/blog/${post.id}`}>
                            <Pencil className="size-3.5" />
                            Edit
                          </Link>
                        </Button>
                        <DeleteItemButton
                          table="blog_posts"
                          id={post.id}
                          label={post.title}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-12 text-center text-muted-foreground"
                >
                  No tutorials yet.{" "}
                  <Link
                    href="/admin/blog/new"
                    className="text-brand hover:underline"
                  >
                    Create one
                  </Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
