import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CategoryForm } from "../category-form";
import { DeleteItemButton } from "@/components/admin/delete-item-button";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";

interface Props { params: Promise<{ id: string }> }

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params;
  await connection();
  const supabase = createAdminClient();
  const { data: cat } = await supabase
    .from("product_categories")
    .select("*")
    .eq("id", id)
    .single();
  if (!cat) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/categories" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" /> Categories
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-foreground font-medium line-clamp-1">{cat.name}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Edit Category</h1>
        <DeleteItemButton
          table="product_categories"
          id={cat.id}
          label={cat.name}
          redirectTo="/admin/categories"
          size="sm"
        />
      </div>
      <CategoryForm initialData={{
        id: cat.id, name: cat.name, slug: cat.slug,
        description: cat.description, image_url: cat.image_url,
        icon: cat.icon, position: cat.position, is_active: cat.is_active,
      }} />
    </div>
  );
}
