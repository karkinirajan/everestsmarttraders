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

interface Industry {
  id: string;
  name: string;
}

interface ProjectFormProps {
  industries: Industry[];
  initialData?: {
    id: string;
    title: string;
    slug: string;
    location: string | null;
    industry_id: string | null;
    summary: string | null;
    challenge: string | null;
    solution: string | null;
    result: string | null;
    cover_image_url: string | null;
    is_published: boolean;
    is_featured: boolean;
    completed_at: string | null;
    seo_title: string | null;
    seo_description: string | null;
  };
}

export function ProjectForm({ industries, initialData }: ProjectFormProps) {
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

    const payload = {
      title: fd.get("title") as string,
      slug: fd.get("slug") as string,
      summary: (fd.get("summary") as string) || null,
      challenge: (fd.get("challenge") as string) || null,
      solution: (fd.get("solution") as string) || null,
      result: (fd.get("result") as string) || null,
      location: (fd.get("location") as string) || null,
      industry_id: (fd.get("industry_id") as string) || null,
      cover_image_url: (fd.get("cover_image_url") as string) || null,
      completed_at: (fd.get("completed_at") as string) || null,
      seo_title: (fd.get("seo_title") as string) || null,
      seo_description: (fd.get("seo_description") as string) || null,
      is_published: fd.get("is_published") === "on",
      is_featured: fd.get("is_featured") === "on",
    };

    startTransition(async () => {
      if (initialData?.id) {
        const result = await adminUpdate("projects", initialData.id, {
          ...payload,
          updated_at: new Date().toISOString(),
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
      } else {
        const result = await adminInsert<{ id: string }>("projects", payload);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/projects/${result.data.id}`);
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

      <div className="p-5 bg-card border border-border rounded-xl space-y-4">
        <h2 className="font-semibold text-foreground text-sm">Project Details</h2>

        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g., Hotel Gate Automation — Kathmandu"
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
            required
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              defaultValue={initialData?.location ?? ""}
              placeholder="e.g., Thamel, Kathmandu"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry_id">Industry</Label>
            <select
              id="industry_id"
              name="industry_id"
              defaultValue={initialData?.industry_id ?? ""}
              className="flex h-9 w-full rounded-lg border border-input bg-field px-3 py-1 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 text-foreground"
            >
              <option value="">— No Industry —</option>
              {industries.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="completed_at">Completion Date</Label>
          <Input
            id="completed_at"
            name="completed_at"
            type="date"
            defaultValue={initialData?.completed_at?.split("T")[0] ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cover_image_url">Cover Image URL</Label>
          <Input
            id="cover_image_url"
            name="cover_image_url"
            type="url"
            defaultValue={initialData?.cover_image_url ?? ""}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            id="summary"
            name="summary"
            defaultValue={initialData?.summary ?? ""}
            placeholder="One-line description shown in project cards"
            rows={2}
          />
        </div>
      </div>

      {/* Case study */}
      <div className="p-5 bg-card border border-border rounded-xl space-y-4">
        <h2 className="font-semibold text-foreground text-sm">Case Study</h2>
        <p className="text-xs text-muted-foreground -mt-2">
          Shown on the public project page as &ldquo;The Challenge / Our Solution / The Result&rdquo;.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="challenge">The Challenge</Label>
          <Textarea
            id="challenge"
            name="challenge"
            defaultValue={initialData?.challenge ?? ""}
            placeholder="What problem did the client need solved?"
            rows={4}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="solution">Our Solution</Label>
          <Textarea
            id="solution"
            name="solution"
            defaultValue={initialData?.solution ?? ""}
            placeholder="What did EST install or configure?"
            rows={4}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="result">The Result</Label>
          <Textarea
            id="result"
            name="result"
            defaultValue={initialData?.result ?? ""}
            placeholder="Outcome for the client after installation"
            rows={4}
          />
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

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-5 bg-card border border-border rounded-xl">
          <div>
            <p className="font-medium text-foreground text-sm">Published</p>
            <p className="text-xs text-muted-foreground">Visible on public site</p>
          </div>
          <Switch name="is_published" defaultChecked={initialData?.is_published ?? false} />
        </div>
        <div className="flex items-center justify-between p-5 bg-card border border-border rounded-xl">
          <div>
            <p className="font-medium text-foreground text-sm">Featured</p>
            <p className="text-xs text-muted-foreground">Show on home page</p>
          </div>
          <Switch name="is_featured" defaultChecked={initialData?.is_featured ?? false} />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <><Loader2 className="size-4 animate-spin" /> Saving...</>
          ) : (
            initialData ? "Save Changes" : "Create Project"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/projects")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
