"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { adminInsert, adminUpdate } from "@/lib/actions/admin-mutate";
import { slugify } from "@/lib/utils";

interface BlogPostFormProps {
  initialData?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string | null;
    cover_image_url: string | null;
    video_url: string | null;
    is_published: boolean;
    author_name: string | null;
    reading_time: number | null;
    seo_title: string | null;
    seo_description: string | null;
  };
}

export function BlogPostForm({ initialData }: BlogPostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!initialData);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slugManual) setSlug(slugify(val));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const readingTimeRaw = fd.get("reading_time") as string;

    const payload = {
      title: fd.get("title") as string,
      slug: fd.get("slug") as string,
      excerpt: (fd.get("excerpt") as string) || null,
      content: (fd.get("content") as string) || null,
      cover_image_url: (fd.get("cover_image_url") as string) || null,
      video_url: (fd.get("video_url") as string) || null,
      is_published: fd.get("is_published") === "on",
      author_name: (fd.get("author_name") as string) || null,
      reading_time: readingTimeRaw ? parseInt(readingTimeRaw, 10) : null,
      seo_title: (fd.get("seo_title") as string) || null,
      seo_description: (fd.get("seo_description") as string) || null,
    };

    startTransition(async () => {
      if (initialData?.id) {
        const result = await adminUpdate("blog_posts", initialData.id, {
          ...payload,
          updated_at: new Date().toISOString(),
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
      } else {
        const result = await adminInsert<{ id: string }>("blog_posts", payload);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/blog/${result.data.id}`);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {saved && (
        <div className="flex items-center gap-2 text-sm text-success bg-success-muted px-4 py-3 rounded-lg">
          <CheckCircle2 className="size-4" />
          Saved successfully.
        </div>
      )}
      {error && (
        <div role="alert" className="text-sm text-destructive bg-destructive-muted px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="p-5 bg-card border border-border rounded-xl space-y-4">
        <h2 className="font-semibold text-foreground text-sm">Tutorial Content</h2>

        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g., How to Install a Gate Automation Motor"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
            placeholder="how-to-install-gate-motor"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea
            id="excerpt"
            name="excerpt"
            defaultValue={initialData?.excerpt ?? ""}
            placeholder="Brief summary shown in listing pages..."
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="content">Tutorial Steps (HTML)</Label>
          <Textarea
            id="content"
            name="content"
            defaultValue={initialData?.content ?? ""}
            placeholder="<h2>Prerequisites</h2>&#10;<p>...</p>&#10;<h2>Step 1: ...</h2>"
            rows={16}
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="author_name">Author Name</Label>
          <Input
            id="author_name"
            name="author_name"
            defaultValue={initialData?.author_name ?? ""}
            placeholder="EST Team"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reading_time">Reading / Watch Time (minutes)</Label>
          <Input
            id="reading_time"
            name="reading_time"
            type="number"
            min={1}
            defaultValue={initialData?.reading_time ?? ""}
            placeholder="e.g., 8"
          />
        </div>
      </div>

      {/* Media */}
      <div className="p-5 bg-card border border-border rounded-xl space-y-4">
        <h2 className="font-semibold text-foreground text-sm">Media</h2>

        <div className="space-y-1.5">
          <Label htmlFor="video_url">Video URL</Label>
          <Input
            id="video_url"
            name="video_url"
            defaultValue={initialData?.video_url ?? ""}
            placeholder="/videos/tutorial.mp4 or https://..."
          />
          <p className="text-xs text-muted-foreground">
            MP4 path or external URL. Shown as the primary video player on the tutorial page.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cover_image_url">Thumbnail / Poster Image URL</Label>
          <Input
            id="cover_image_url"
            name="cover_image_url"
            defaultValue={initialData?.cover_image_url ?? ""}
            placeholder="/images/home-automation/home-automation-001.jpg"
          />
          <p className="text-xs text-muted-foreground">
            Shown as the video poster and in listing card thumbnails.
          </p>
        </div>
      </div>

      {/* SEO */}
      <div className="p-5 bg-card border border-border rounded-xl space-y-4">
        <h2 className="font-semibold text-foreground text-sm">SEO</h2>
        <div className="space-y-1.5">
          <Label htmlFor="seo_title">Meta Title</Label>
          <Input
            id="seo_title"
            name="seo_title"
            defaultValue={initialData?.seo_title ?? ""}
            placeholder="Overrides page title in search results"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="seo_description">Meta Description</Label>
          <Textarea
            id="seo_description"
            name="seo_description"
            defaultValue={initialData?.seo_description ?? ""}
            placeholder="150–160 characters for search results"
            rows={2}
          />
        </div>
      </div>

      {/* Publish */}
      <div className="flex items-center justify-between p-5 bg-card border border-border rounded-xl">
        <div>
          <p className="font-medium text-foreground text-sm">Published</p>
          <p className="text-xs text-muted-foreground">Make visible on the public site</p>
        </div>
        <Switch name="is_published" defaultChecked={initialData?.is_published ?? false} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <><Loader2 className="size-4 animate-spin" /> Saving...</>
          ) : (
            initialData ? "Save Changes" : "Create Tutorial"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/blog")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
