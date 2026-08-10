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

interface FaqFormProps {
  initialData?: {
    id: string;
    question: string;
    answer: string;
    category: string | null;
    is_published: boolean;
    position: number;
  };
}

export function FaqForm({ initialData }: FaqFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const payload = {
      question: fd.get("question") as string,
      answer: fd.get("answer") as string,
      category: (fd.get("category") as string) || null,
      position: parseInt(fd.get("position") as string, 10) || 0,
      is_published: fd.get("is_published") === "on",
    };

    startTransition(async () => {
      if (initialData?.id) {
        const result = await adminUpdate("faqs", initialData.id, payload);
        if (!result.success) { setError(result.error); return; }
        setSaved(true);
        router.refresh();
      } else {
        const result = await adminInsert<{ id: string }>("faqs", payload);
        if (!result.success) { setError(result.error); return; }
        router.push(`/admin/faqs/${result.data.id}`);
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
        <h2 className="font-semibold text-foreground text-sm">FAQ Details</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category" name="category"
              defaultValue={initialData?.category ?? ""}
              placeholder="e.g., Gate Automation, General, Pricing"
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
          <Label htmlFor="question">Question *</Label>
          <Input
            id="question" name="question"
            defaultValue={initialData?.question ?? ""}
            placeholder="e.g., How long does installation take?"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="answer">Answer *</Label>
          <Textarea
            id="answer" name="answer" rows={6}
            defaultValue={initialData?.answer ?? ""}
            placeholder="Provide a clear, helpful answer..."
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-5 bg-card border border-border rounded-xl">
        <div>
          <p className="font-medium text-foreground text-sm">Published</p>
          <p className="text-xs text-muted-foreground">Show on the public FAQ page</p>
        </div>
        <Switch name="is_published" defaultChecked={initialData?.is_published ?? true} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : (initialData ? "Save Changes" : "Add FAQ")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/faqs")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
