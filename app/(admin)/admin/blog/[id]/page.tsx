import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import { BlogPostForm } from "../blog-form";
import { DeleteItemButton } from "@/components/admin/delete-item-button";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";

interface Props {
  params: Promise<{ id: string }>;
}

async function EditBlogPostContent({ params }: Props) {
  await connection();
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single();
  if (!post) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/blog"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Tutorials
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-foreground font-medium line-clamp-1">
          {post.title}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Edit Tutorial</h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/tutorials/${post.slug}`}
            target="_blank"
            className="text-sm text-brand hover:underline transition-colors"
          >
            View on site →
          </Link>
          <DeleteItemButton
            table="blog_posts"
            id={post.id}
            label={post.title}
            redirectTo="/admin/blog"
            size="sm"
          />
        </div>
      </div>
      <BlogPostForm
        initialData={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          cover_image_url: post.cover_image_url,
          video_url: post.video_url,
          is_published: post.is_published,
          author_name: post.author_name,
          reading_time: post.reading_time,
          seo_title: post.seo_title,
          seo_description: post.seo_description,
        }}
      />
    </div>
  );
}

export default async function EditBlogPostPage({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <EditBlogPostContent params={params} />
    </Suspense>
  );
}
