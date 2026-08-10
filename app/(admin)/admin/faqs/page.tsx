import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";

async function getFaqs() {
  await connection();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("faqs")
    .select("id, question, category, position, is_published")
    .order("category", { nullsFirst: true })
    .order("position")
    .order("question");
  return data ?? [];
}

export default async function FaqsPage() {
  await connection();
  const faqs = await getFaqs();

  // Group by category
  const grouped = faqs.reduce<Record<string, typeof faqs>>((acc, faq) => {
    const key = faq.category ?? "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(faq);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">FAQs</h1>
          <p className="text-muted-foreground mt-0.5">{faqs.length} questions</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/faqs/new">
            <Plus className="size-4" /> New FAQ
          </Link>
        </Button>
      </div>

      {Object.keys(grouped).length > 0 ? (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/40">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{category}</p>
            </div>
            <div className="divide-y divide-border">
              {items.map((faq) => (
                <div key={faq.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-1">{faq.question}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:block">#{faq.position}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      faq.is_published ? "bg-success-muted text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {faq.is_published ? "Published" : "Hidden"}
                    </span>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/faqs/${faq.id}`}>
                        <Pencil className="size-3.5" /> Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="bg-card border border-border rounded-xl px-4 py-12 text-center text-muted-foreground">
          No FAQs yet.{" "}
          <Link href="/admin/faqs/new" className="text-brand hover:underline">
            Add one
          </Link>
        </div>
      )}
    </div>
  );
}
