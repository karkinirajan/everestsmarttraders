import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TestimonialForm } from "../testimonial-form";
import { DeleteItemButton } from "@/components/admin/delete-item-button";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";

interface Props { params: Promise<{ id: string }> }

export default async function EditTestimonialPage({ params }: Props) {
  const { id } = await params;
  await connection();
  const supabase = createAdminClient();
  const { data: t } = await supabase
    .from("testimonials")
    .select("*")
    .eq("id", id)
    .single();
  if (!t) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/testimonials" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" /> Testimonials
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-foreground font-medium line-clamp-1">{t.client_name}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Edit Testimonial</h1>
        <DeleteItemButton
          table="testimonials"
          id={t.id}
          label={`testimonial from ${t.client_name}`}
          redirectTo="/admin/testimonials"
          size="sm"
        />
      </div>
      <TestimonialForm initialData={{
        id: t.id, client_name: t.client_name, client_title: t.client_title,
        client_company: t.client_company, content: t.content,
        rating: t.rating, is_featured: t.is_featured, is_published: t.is_published,
      }} />
    </div>
  );
}
