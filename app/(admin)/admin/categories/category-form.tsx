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

interface CategoryFormProps {
  initialData?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    icon: string | null;
    position: number;
    is_active: boolean;
  };
}

export function CategoryForm({ initialData }: CategoryFormProps) {
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
      description: (fd.get("description") as string) || null,
      image_url: (fd.get("image_url") as string) || null,
      icon: (fd.get("icon") as string) || null,
      position: parseInt(fd.get("position") as string, 10) || 0,
      is_active: fd.get("is_active") === "on",
    };

    startTransition(async () => {
      if (initialData?.id) {
        const result = await adminUpdate("product_categories", initialData.id, {
          ...payload,
          updated_at: new Date().toISOString(),
        });
        if (!result.success) { setError(result.error); return; }
        setSaved(true);
        router.refresh();
      } else {
        const result = await adminInsert<{ id: string }>("product_categories", payload);
        if (!result.success) { setError(result.error); return; }
        router.push(`/admin/categories/${result.data.id}`);
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
        <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="p-5 bg-card border border-border rounded-xl space-y-4">
        <h2 className="font-semibold text-foreground text-sm">Category Details</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name" name="name" value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Gate Automation" required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug" name="slug" value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
              placeholder="gate-automation" required
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="icon">Icon</Label>
            <Input
              id="icon" name="icon"
              defaultValue={initialData?.icon ?? ""}
              placeholder="e.g., gate or 🚪"
            />
            <p className="text-xs text-muted-foreground">Lucide icon name or emoji</p>
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
          <Label htmlFor="image_url">Image URL</Label>
          <Input
            id="image_url" name="image_url" type="url"
            defaultValue={initialData?.image_url ?? ""}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description" name="description" rows={3}
            defaultValue={initialData?.description ?? ""}
            placeholder="Short description of this product category"
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
          {isPending ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : (initialData ? "Save Changes" : "Create Category")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/categories")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
