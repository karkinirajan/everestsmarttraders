"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { adminInsert, adminUpdate } from "@/lib/actions/admin-mutate";

interface TestimonialFormProps {
  initialData?: {
    id: string;
    client_name: string;
    client_title: string | null;
    client_company: string | null;
    content: string;
    rating: number | null;
    is_featured: boolean;
    is_published: boolean;
  };
}

export function TestimonialForm({ initialData }: TestimonialFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(initialData?.rating ?? 5);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const payload = {
      client_name: fd.get("client_name") as string,
      client_title: (fd.get("client_title") as string) || null,
      client_company: (fd.get("client_company") as string) || null,
      content: fd.get("content") as string,
      rating,
      is_featured: fd.get("is_featured") === "on",
      is_published: fd.get("is_published") === "on",
    };

    startTransition(async () => {
      if (initialData?.id) {
        const result = await adminUpdate("testimonials", initialData.id, payload);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setSaved(true);
        router.refresh();
      } else {
        const result = await adminInsert<{ id: string }>("testimonials", payload);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/testimonials/${result.data.id}`);
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
        <h2 className="font-semibold text-foreground text-sm">Client Info</h2>

        <div className="space-y-1.5">
          <Label htmlFor="client_name">Client Name *</Label>
          <Input
            id="client_name"
            name="client_name"
            defaultValue={initialData?.client_name ?? ""}
            placeholder="e.g., Ramesh Shrestha"
            required
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="client_title">Job Title</Label>
            <Input
              id="client_title"
              name="client_title"
              defaultValue={initialData?.client_title ?? ""}
              placeholder="e.g., Property Manager"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client_company">Company</Label>
            <Input
              id="client_company"
              name="client_company"
              defaultValue={initialData?.client_company ?? ""}
              placeholder="e.g., Hotel Annapurna"
            />
          </div>
        </div>

        {/* Star rating */}
        <div className="space-y-1.5">
          <Label>Rating</Label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setRating(n)}
                className="p-0.5"
              >
                <Star
                  className={`size-6 ${n <= rating ? "fill-est-amber text-est-amber" : "text-muted-foreground"}`}
                />
              </Button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">
              {rating}/5
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="content">Testimonial *</Label>
          <Textarea
            id="content"
            name="content"
            rows={5}
            defaultValue={initialData?.content ?? ""}
            placeholder="What did the client say about your service?"
            required
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {[
          {
            name: "is_published",
            label: "Published",
            desc: "Visible on public site",
            checked: initialData?.is_published ?? true,
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
            "Add Testimonial"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/testimonials")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
