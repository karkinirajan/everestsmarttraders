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

async function getIndustries() {
  await connection();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("industries")
    .select("id, name, slug, icon, position, is_active")
    .order("position")
    .order("name");
  return data ?? [];
}

export default async function IndustriesPage() {
  await connection();
  const industries = await getIndustries();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Industries</h1>
          <p className="text-muted-foreground mt-0.5">{industries.length} industries</p>
        </div>
        <Button asChild size="sm" className="self-start sm:self-auto">
          <Link href="/admin/industries/new">
            <Plus className="size-4" /> New Industry
          </Link>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Industry</TableHead>
              <TableHead className="hidden sm:table-cell">Slug</TableHead>
              <TableHead className="hidden md:table-cell">Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {industries.length > 0 ? (
              industries.map((ind) => (
                <TableRow key={ind.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {ind.icon && <span className="text-base">{ind.icon}</span>}
                      <Link
                        href={`/admin/industries/${ind.id}`}
                        className="font-medium text-foreground hover:text-brand transition-colors"
                      >
                        {ind.name}
                      </Link>
                    </div>
                    <p className="sm:hidden text-xs text-muted-foreground font-mono mt-1">
                      {ind.slug}
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground font-mono">
                    {ind.slug}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {ind.position}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ind.is_active ? "success" : "muted"}>
                      {ind.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="xs">
                        <Link href={`/admin/industries/${ind.id}`}>
                          <Pencil className="size-3.5" /> Edit
                        </Link>
                      </Button>
                      <DeleteItemButton
                        table="industries"
                        id={ind.id}
                        label={ind.name}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  No industries yet.{" "}
                  <Link href="/admin/industries/new" className="text-brand hover:underline">
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
