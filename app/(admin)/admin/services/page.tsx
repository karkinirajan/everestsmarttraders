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

async function getServices() {
  await connection();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("services")
    .select("id, name, slug, intro, icon, position, is_active, is_published")
    .order("position")
    .order("name");
  return data ?? [];
}

export default async function ServicesPage() {
  await connection();
  const services = await getServices();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground mt-0.5">{services.length} services</p>
        </div>
        <Button asChild size="sm" className="self-start sm:self-auto">
          <Link href="/admin/services/new">
            <Plus className="size-4" /> New Service
          </Link>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead className="hidden sm:table-cell">Slug</TableHead>
              <TableHead className="hidden md:table-cell">Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length > 0 ? (
              services.map((svc) => (
                <TableRow key={svc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {svc.icon && <span className="text-base">{svc.icon}</span>}
                      <div>
                        <Link
                          href={`/admin/services/${svc.id}`}
                          className="font-medium text-foreground hover:text-brand transition-colors"
                        >
                          {svc.name}
                        </Link>
                        {svc.intro && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {svc.intro}
                          </p>
                        )}
                        <p className="sm:hidden text-xs text-muted-foreground font-mono mt-1">
                          {svc.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground font-mono">
                    {svc.slug}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {svc.position}
                  </TableCell>
                  <TableCell>
                    <Badge variant={svc.is_published ? "success" : "muted"}>
                      {svc.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="xs">
                        <Link href={`/admin/services/${svc.id}`}>
                          <Pencil className="size-3.5" /> Edit
                        </Link>
                      </Button>
                      <DeleteItemButton
                        table="services"
                        id={svc.id}
                        label={svc.name}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  No services yet.{" "}
                  <Link href="/admin/services/new" className="text-brand hover:underline">
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
