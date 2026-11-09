import Link from "next/link";
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

async function getCategories() {
  await connection();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_categories")
    .select("id, name, slug, icon, position, is_active, products(count)")
    .order("position")
    .order("name");
  return data ?? [];
}

export default async function CategoriesPage() {
  await connection();
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Product Categories
          </h1>
          <p className="text-muted-foreground mt-0.5">
            {categories.length} categories
          </p>
        </div>
        <Button asChild size="sm" className="self-start sm:self-auto">
          <Link href="/admin/categories/new">
            <Plus className="size-4" /> New Category
          </Link>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Slug</TableHead>
              <TableHead className="hidden md:table-cell">Products</TableHead>
              <TableHead className="hidden lg:table-cell">Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length > 0 ? (
              categories.map((cat) => {
                const count =
                  (cat.products as { count: number }[])?.[0]?.count ?? 0;
                return (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {cat.icon && (
                          <span className="text-base text-foreground">
                            {cat.icon}
                          </span>
                        )}
                        <Link
                          href={`/admin/categories/${cat.id}`}
                          className="font-medium text-foreground hover:text-brand transition-colors"
                        >
                          {cat.name}
                        </Link>
                      </div>
                      <div className="sm:hidden mt-1 text-xs text-muted-foreground font-mono">
                        {cat.slug} · {count} products
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground font-mono">
                      {cat.slug}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {count}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {cat.position}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.is_active ? "success" : "muted"}>
                        {cat.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="xs">
                          <Link href={`/admin/categories/${cat.id}`}>
                            <Pencil className="size-3.5" /> Edit
                          </Link>
                        </Button>
                        <DeleteItemButton
                          table="product_categories"
                          id={cat.id}
                          label={cat.name}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  No categories yet.{" "}
                  <Link
                    href="/admin/categories/new"
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
