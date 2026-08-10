import Link from "next/link";
import { Plus, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";
import { formatDate } from "@/lib/utils";

async function getTestimonials() {
  await connection();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("testimonials")
    .select("id, client_name, client_company, content, rating, is_featured, is_published, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function TestimonialsPage() {
  await connection();
  const testimonials = await getTestimonials();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Testimonials</h1>
          <p className="text-muted-foreground mt-0.5">{testimonials.length} testimonials</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/testimonials/new">
            <Plus className="size-4" /> Add Testimonial
          </Link>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Excerpt</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Date</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {testimonials.length > 0 ? (
                testimonials.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{t.client_name}</p>
                      {t.client_company && (
                        <p className="text-xs text-muted-foreground">{t.client_company}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell max-w-[220px]">
                      <p className="text-xs text-muted-foreground line-clamp-2">{t.content}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`size-3.5 ${i < (t.rating ?? 0) ? "fill-est-amber text-est-amber" : "text-muted-foreground/40"}`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${
                          t.is_published ? "bg-success-muted text-success" : "bg-muted text-muted-foreground"
                        }`}>
                          {t.is_published ? "Published" : "Hidden"}
                        </span>
                        {t.is_featured && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium w-fit bg-est-amber-muted text-est-amber">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/testimonials/${t.id}`}>
                          <Pencil className="size-3.5" /> Edit
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No testimonials yet.{" "}
                    <Link href="/admin/testimonials/new" className="text-brand hover:underline">
                      Add one
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
