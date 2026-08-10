import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";
import { pickFallbackImage } from "@/lib/image-fallbacks";

async function getAdminProducts() {
  await connection();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("products")
    .select("*, category:product_categories(name, slug)")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export default async function AdminProductsPage() {
  await connection();
  const products = await getAdminProducts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-0.5">
            {products.length} products total
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/products/new">
            <Plus className="size-4" />
            Add Product
          </Link>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-10" />
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Product
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  Price Range
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length > 0 ? (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="relative size-10 rounded-lg overflow-hidden bg-muted shrink-0">
                        <Image
                          src={
                            product.cover_image_url ??
                            pickFallbackImage(product.slug, 35)
                          }
                          alt={product.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground line-clamp-1">
                        {product.name}
                      </p>
                      {product.is_featured && (
                        <span className="text-xs text-est-amber">Featured</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {product.category?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {product.price_range ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          product.is_published
                            ? "bg-success-muted text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {product.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/products/${product.id}`}>
                          <Pencil className="size-3.5" />
                          Edit
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No products yet.{" "}
                    <Link
                      href="/admin/products/new"
                      className="text-brand hover:underline"
                    >
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
