import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Product Categories
          </h1>
          <p className="text-muted-foreground mt-0.5">
            {categories.length} categories
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/categories/new">
            <Plus className="size-4" /> New Category
          </Link>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-foreground">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Slug
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  Products
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                  Position
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="hover:bg-muted/30 transition-colors text-foreground"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {cat.icon && (
                          <span className="text-base text-foreground">
                            {cat.icon}
                          </span>
                        )}
                        <p className="font-medium text-foreground">
                          {cat.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground font-mono">
                      {cat.slug}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                      {(cat.products as { count: number }[])?.[0]?.count ?? 0}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {cat.position}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={cat.is_active ? "success" : "muted"}>
                        {cat.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/categories/${cat.id}`}>
                          <Pencil className="size-3.5" /> Edit
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
                    No categories yet.{" "}
                    <Link
                      href="/admin/categories/new"
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
