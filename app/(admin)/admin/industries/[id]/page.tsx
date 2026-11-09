import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { IndustryForm } from "../industry-form";
import { DeleteItemButton } from "@/components/admin/delete-item-button";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";

interface Props { params: Promise<{ id: string }> }

export default async function EditIndustryPage({ params }: Props) {
  const { id } = await params;
  await connection();
  const supabase = createAdminClient();
  const { data: ind } = await supabase
    .from("industries")
    .select("*")
    .eq("id", id)
    .single();
  if (!ind) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/industries" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" /> Industries
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-foreground font-medium line-clamp-1">{ind.name}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Edit Industry</h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/industries/${ind.slug}`}
            target="_blank"
            className="text-sm text-brand hover:underline transition-colors"
          >
            View on site →
          </Link>
          <DeleteItemButton
            table="industries"
            id={ind.id}
            label={ind.name}
            redirectTo="/admin/industries"
            size="sm"
          />
        </div>
      </div>
      <IndustryForm initialData={{
        id: ind.id, name: ind.name, slug: ind.slug,
        icon: ind.icon, description: ind.description,
        cover_image_url: ind.cover_image_url,
        solutions_summary: ind.solutions_summary,
        is_active: ind.is_active, position: ind.position,
      }} />
    </div>
  );
}
