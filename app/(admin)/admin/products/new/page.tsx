import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "../product-form";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";

async function getCategories() {
  await connection();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("position");
  return data ?? [];
}

export default async function NewProductPage() {
  await connection();
  const categories = await getCategories();
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
          Products
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-foreground font-medium">New Product</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground">Add Product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
