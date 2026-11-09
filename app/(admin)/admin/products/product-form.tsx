"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { adminInsert, adminUpdate } from "@/lib/actions/admin-mutate";
import { slugify } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductFormProps {
  categories: Category[];
  initialData?: {
    id: string;
    name: string;
    slug: string;
    category_id: string | null;
    short_description: string | null;
    description: string | null;
    price_range: string | null;
    cover_image_url: string | null;
    features: string[];
    is_published: boolean;
    is_featured: boolean;
    is_active: boolean;
  };
}

export function ProductForm({ categories, initialData }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!initialData);
  const [features, setFeatures] = useState<string[]>(
    initialData?.features ?? [""],
  );

  function handleNameChange(val: string) {
    setName(val);
    if (!slugManual) setSlug(slugify(val));
  }

  function addFeature() {
    setFeatures([...features, ""]);
  }
  function removeFeature(i: number) {
    setFeatures(features.filter((_, idx) => idx !== i));
  }
  function updateFeature(i: number, val: string) {
    const updated = [...features];
    updated[i] = val;
    setFeatures(updated);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const payload = {
      name: fd.get("name") as string,
      slug: fd.get("slug") as string,
      category_id: (fd.get("category_id") as string) || null,
      short_description: (fd.get("short_description") as string) || null,
      description: (fd.get("description") as string) || null,
      price_range: (fd.get("price_range") as string) || null,
      cover_image_url: (fd.get("cover_image_url") as string) || null,
      features: features.filter(Boolean),
      is_published: fd.get("is_published") === "on",
      is_featured: fd.get("is_featured") === "on",
      is_active: true,
    };

    startTransition(async () => {
      if (initialData?.id) {
        const result = await adminUpdate("products", initialData.id, {
          ...payload,
          updated_at: new Date().toISOString(),
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        setSaved(true);
        router.refresh();
      } else {
        const result = await adminInsert<{ id: string }>("products", payload);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/products/${result.data.id}`);
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
        <div role="alert" className="text-sm text-destructive bg-destructive-muted px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Core details */}
      <div className="p-5 bg-card border border-border rounded-xl space-y-4">
        <h2 className="font-semibold text-foreground text-sm">
          Product Details
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., CAME BX74 Sliding Gate Motor"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManual(true);
              }}
              placeholder="came-bx74-sliding-gate-motor"
              required
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="category_id">Category</Label>
            <select
              id="category_id"
              name="category_id"
              defaultValue={initialData?.category_id ?? ""}
              className="flex h-9 w-full rounded-lg border border-input bg-field px-3 py-1 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 text-foreground"
            >
              <option value="">— No Category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price_range">Price Range</Label>
            <Input
              id="price_range"
              name="price_range"
              defaultValue={initialData?.price_range ?? ""}
              placeholder="e.g., NPR 25,000 – 45,000"
            />
          </div>
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
          <Label htmlFor="short_description">Short Description</Label>
          <Textarea
            id="short_description"
            name="short_description"
            rows={2}
            defaultValue={initialData?.short_description ?? ""}
            placeholder="1–2 sentence product summary for cards and SEO"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Full Description (HTML)</Label>
          <Textarea
            id="description"
            name="description"
            rows={8}
            defaultValue={initialData?.description ?? ""}
            placeholder="<p>Detailed product description...</p>"
            className="font-mono text-xs"
          />
        </div>
      </div>

      {/* Features */}
      <div className="p-5 bg-card border border-border rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-sm">
            Key Features
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFeature}
          >
            <Plus className="size-3.5" /> Add Feature
          </Button>
        </div>
        <div className="space-y-2">
          {features.map((feat, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={feat}
                onChange={(e) => updateFeature(i, e.target.value)}
                placeholder={`Feature ${i + 1}...`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFeature(i)}
                aria-label={`Remove feature ${i + 1}`}
                title={`Remove feature ${i + 1}`}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Visibility toggles */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          {
            name: "is_published",
            label: "Published",
            desc: "Visible on public site",
            checked: initialData?.is_published ?? false,
          },
          {
            name: "is_featured",
            label: "Featured",
            desc: "Show on home page",
            checked: initialData?.is_featured ?? false,
          },
        ].map(({ name: n, label, desc, checked }) => (
          <div
            key={n}
            className="flex items-center justify-between p-5 bg-card border border-border rounded-xl"
          >
            <div>
              <p className="font-medium text-foreground text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <Switch name={n} defaultChecked={checked} />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving...
            </>
          ) : initialData ? (
            "Save Changes"
          ) : (
            "Create Product"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/products")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
