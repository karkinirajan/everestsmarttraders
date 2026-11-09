import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "../product-form";
import { DeleteItemButton } from "@/components/admin/delete-item-button";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";

async function getData(id: string) {
  await connection();
  const supabase = createAdminClient();
  const [productRes, categoriesRes] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("product_categories").select("id, name, slug").eq("is_active", true).order("position"),
  ]);
  return { product: productRes.data, categories: categoriesRes.data ?? [] };
}

interface Props { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const { product, categories } = await getData(id);
  if (!product) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" /> Products
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-foreground font-medium line-clamp-1">{product.name}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Edit Product</h1>
        <DeleteItemButton
          table="products"
          id={product.id}
          label={product.name}
          redirectTo="/admin/products"
          size="sm"
        />
      </div>
      <ProductForm categories={categories} initialData={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        category_id: product.category_id,
        short_description: product.short_description,
        description: product.description,
        price_range: product.price_range,
        cover_image_url: product.cover_image_url,
        features: Array.isArray(product.features) ? product.features : [],
        is_published: product.is_published,
        is_featured: product.is_featured,
        is_active: product.is_active,
      }} />
    </div>
  );
}
