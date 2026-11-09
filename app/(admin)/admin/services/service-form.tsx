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

interface ServiceFormProps {
  initialData?: {
    id: string;
    name: string;
    slug: string;
    intro: string | null;
    description: string | null;
    key_benefits: string[];
    icon: string | null;
    cover_image_url: string | null;
    is_active: boolean;
    is_published: boolean;
    position: number;
  };
}

export function ServiceForm({ initialData }: ServiceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!initialData);
  const [benefits, setBenefits] = useState<string[]>(
    initialData?.key_benefits?.length ? initialData.key_benefits : [""],
  );

  function handleNameChange(val: string) {
    setName(val);
    if (!slugManual) setSlug(slugify(val));
  }

  function addBenefit() {
    setBenefits([...benefits, ""]);
  }
  function removeBenefit(i: number) {
    setBenefits(benefits.filter((_, idx) => idx !== i));
  }
  function updateBenefit(i: number, val: string) {
    const updated = [...benefits];
    updated[i] = val;
    setBenefits(updated);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const payload = {
      name: fd.get("name") as string,
      slug: fd.get("slug") as string,
      intro: (fd.get("intro") as string) || null,
      description: (fd.get("description") as string) || null,
      key_benefits: benefits.filter(Boolean),
      icon: (fd.get("icon") as string) || null,
      cover_image_url: (fd.get("cover_image_url") as string) || null,
      position: parseInt(fd.get("position") as string, 10) || 0,
      is_active: fd.get("is_active") === "on",
      is_published: fd.get("is_published") === "on",
    };

    startTransition(async () => {
      if (initialData?.id) {
        const result = await adminUpdate("services", initialData.id, {
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
        const result = await adminInsert<{ id: string }>("services", payload);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/services/${result.data.id}`);
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

      <div className="p-5 bg-card border border-border rounded-xl space-y-4">
        <h2 className="font-semibold text-foreground text-sm">
          Service Details
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Service Name *</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Gate Automation Installation"
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
              placeholder="gate-automation-installation"
              required
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="icon">Icon</Label>
            <Input
              id="icon"
              name="icon"
              defaultValue={initialData?.icon ?? ""}
              placeholder="e.g., settings or ⚙️"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="position">Sort Position</Label>
            <Input
              id="position"
              name="position"
              type="number"
              min="0"
              defaultValue={initialData?.position ?? 0}
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
          <Label htmlFor="intro">Intro / Tagline</Label>
          <Input
            id="intro"
            name="intro"
            defaultValue={initialData?.intro ?? ""}
            placeholder="Short one-liner shown on cards and banners"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Full Description (HTML)</Label>
          <Textarea
            id="description"
            name="description"
            rows={8}
            defaultValue={initialData?.description ?? ""}
            placeholder="<p>Detailed service description...</p>"
            className="font-mono text-xs"
          />
        </div>
      </div>

      {/* Key Benefits */}
      <div className="p-5 bg-card border border-border rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-sm">
            Key Benefits
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addBenefit}
          >
            <Plus className="size-3.5" /> Add Benefit
          </Button>
        </div>
        <div className="space-y-2">
          {benefits.map((benefit, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={benefit}
                onChange={(e) => updateBenefit(i, e.target.value)}
                placeholder={`Benefit ${i + 1}...`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeBenefit(i)}
                aria-label={`Remove benefit ${i + 1}`}
                title={`Remove benefit ${i + 1}`}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Visibility */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          {
            name: "is_published",
            label: "Published",
            desc: "Visible on public site",
            checked: initialData?.is_published ?? false,
          },
          {
            name: "is_active",
            label: "Active",
            desc: "Available for linking to products/FAQs",
            checked: initialData?.is_active ?? true,
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
            "Create Service"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/services")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
