import Link from "next/link";
import { Plus, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteItemButton } from "@/components/admin/delete-item-button";
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Testimonials</h1>
          <p className="text-muted-foreground mt-0.5">{testimonials.length} testimonials</p>
        </div>
        <Button asChild size="sm" className="self-start sm:self-auto">
          <Link href="/admin/testimonials/new">
            <Plus className="size-4" /> Add Testimonial
          </Link>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="hidden sm:table-cell">Excerpt</TableHead>
              <TableHead className="hidden md:table-cell">Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {testimonials.length > 0 ? (
              testimonials.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link
                      href={`/admin/testimonials/${t.id}`}
                      className="font-medium text-foreground hover:text-brand transition-colors block"
                    >
                      {t.client_name}
                    </Link>
                    {t.client_company && (
                      <p className="text-xs text-muted-foreground">{t.client_company}</p>
                    )}
                    <p className="sm:hidden text-xs text-muted-foreground line-clamp-1 mt-1">
                      {t.content}
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell max-w-[260px]">
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.content}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div
                      className="flex items-center gap-0.5"
                      aria-label={`Rated ${t.rating ?? 0} out of 5 stars`}
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-3.5 ${
                            i < (t.rating ?? 0)
                              ? "fill-est-amber text-est-amber"
                              : "text-muted-foreground/35"
                          }`}
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={t.is_published ? "success" : "muted"}>
                        {t.is_published ? "Published" : "Hidden"}
                      </Badge>
                      {t.is_featured && <Badge variant="amber">Featured</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(t.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="xs">
                        <Link href={`/admin/testimonials/${t.id}`}>
                          <Pencil className="size-3.5" /> Edit
                        </Link>
                      </Button>
                      <DeleteItemButton
                        table="testimonials"
                        id={t.id}
                        label={`testimonial from ${t.client_name}`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No testimonials yet.{" "}
                  <Link href="/admin/testimonials/new" className="text-brand hover:underline">
                    Add one
                  </Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
