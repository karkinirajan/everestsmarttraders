import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-0.5">
            {products.length} products total
          </p>
        </div>
        <Button asChild size="sm" className="self-start sm:self-auto">
          <Link href="/admin/products/new">
            <Plus className="size-4" />
            Add Product
          </Link>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Image</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="hidden md:table-cell">Price Range</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length > 0 ? (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="w-14">
                    <div className="relative size-10 rounded-lg overflow-hidden bg-muted shrink-0 border border-border/60">
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
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="font-medium text-foreground hover:text-brand transition-colors line-clamp-1"
                      >
                        {product.name}
                      </Link>
                      {product.is_featured && (
                        <Badge variant="amber">Featured</Badge>
                      )}
                    </div>
                    <div className="sm:hidden mt-1 text-xs text-muted-foreground">
                      {product.category?.name ?? "Uncategorized"}
                      {product.price_range ? ` · ${product.price_range}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {product.category?.name ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                    {product.price_range ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={product.is_published ? "success" : "muted"}
                    >
                      {product.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="xs">
                        <Link href={`/admin/products/${product.id}`}>
                          <Pencil className="size-3.5" />
                          Edit
                        </Link>
                      </Button>
                      <DeleteItemButton
                        table="products"
                        id={product.id}
                        label={product.name}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  No products yet.{" "}
                  <Link
                    href="/admin/products/new"
                    className="text-brand hover:underline"
                  >
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
