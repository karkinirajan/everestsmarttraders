import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground mt-0.5">{services.length} services</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/services/new">
            <Plus className="size-4" /> New Service
          </Link>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Service</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Position</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.length > 0 ? (
                services.map((svc) => (
                  <tr key={svc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {svc.icon && <span className="text-base">{svc.icon}</span>}
                        <div>
                          <p className="font-medium text-foreground">{svc.name}</p>
                          {svc.intro && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{svc.intro}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground font-mono">
                      {svc.slug}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                      {svc.position}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        svc.is_published
                          ? "bg-success-muted text-success"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {svc.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/services/${svc.id}`}>
                          <Pencil className="size-3.5" /> Edit
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    No services yet.{" "}
                    <Link href="/admin/services/new" className="text-brand hover:underline">
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
