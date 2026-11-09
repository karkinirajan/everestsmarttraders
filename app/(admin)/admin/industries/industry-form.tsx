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

interface IndustryFormProps {
  initialData?: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    description: string | null;
    cover_image_url: string | null;
    solutions_summary: string | null;
    is_active: boolean;
    position: number;
  };
}

export function IndustryForm({ initialData }: IndustryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!initialData);

  function handleNameChange(val: string) {
    setName(val);
    if (!slugManual) setSlug(slugify(val));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const payload = {
      name: fd.get("name") as string,
      slug: fd.get("slug") as string,
      icon: (fd.get("icon") as string) || null,
      description: (fd.get("description") as string) || null,
      cover_image_url: (fd.get("cover_image_url") as string) || null,
      solutions_summary: (fd.get("solutions_summary") as string) || null,
      position: parseInt(fd.get("position") as string, 10) || 0,
      is_active: fd.get("is_active") === "on",
    };

    startTransition(async () => {
      if (initialData?.id) {
        const result = await adminUpdate("industries", initialData.id, payload);
        if (!result.success) { setError(result.error); return; }
        setSaved(true);
        router.refresh();
      } else {
        const result = await adminInsert<{ id: string }>("industries", payload);
        if (!result.success) { setError(result.error); return; }
        router.push(`/admin/industries/${result.data.id}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {saved && (
        <div className="flex items-center gap-2 text-sm text-success bg-success-muted px-4 py-3 rounded-lg">
          <CheckCircle2 className="size-4" /> Saved successfully.
        </div>
      )}
      {error && (
        <div role="alert" className="text-sm text-destructive bg-destructive-muted px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="p-5 bg-card border border-border rounded-xl space-y-4">
        <h2 className="font-semibold text-foreground text-sm">Industry Details</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Industry Name *</Label>
            <Input
              id="name" name="name" value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Hospitality" required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug" name="slug" value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
              placeholder="hospitality" required
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="icon">Icon</Label>
            <Input
              id="icon" name="icon"
              defaultValue={initialData?.icon ?? ""}
              placeholder="e.g., hotel or 🏨"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="position">Sort Position</Label>
            <Input
              id="position" name="position" type="number" min="0"
              defaultValue={initialData?.position ?? 0}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cover_image_url">Cover Image URL</Label>
          <Input
            id="cover_image_url" name="cover_image_url" type="url"
            defaultValue={initialData?.cover_image_url ?? ""}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description" name="description" rows={3}
            defaultValue={initialData?.description ?? ""}
            placeholder="Brief overview of this industry vertical"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="solutions_summary">Solutions Summary</Label>
          <Textarea
            id="solutions_summary" name="solutions_summary" rows={3}
            defaultValue={initialData?.solutions_summary ?? ""}
            placeholder="How EST serves this industry — shown on the industry detail page"
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-5 bg-card border border-border rounded-xl">
        <div>
          <p className="font-medium text-foreground text-sm">Active</p>
          <p className="text-xs text-muted-foreground">Show in navigation and filters</p>
        </div>
        <Switch name="is_active" defaultChecked={initialData?.is_active ?? true} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : (initialData ? "Save Changes" : "Create Industry")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/industries")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
