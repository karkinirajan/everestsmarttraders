import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Industries</h1>
          <p className="text-muted-foreground mt-0.5">{industries.length} industries</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/industries/new">
            <Plus className="size-4" /> New Industry
          </Link>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Industry</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Position</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {industries.length > 0 ? (
                industries.map((ind) => (
                  <tr key={ind.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {ind.icon && <span className="text-base">{ind.icon}</span>}
                        <p className="font-medium text-foreground">{ind.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground font-mono">
                      {ind.slug}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                      {ind.position}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ind.is_active ? "bg-success-muted text-success" : "bg-muted text-muted-foreground"
                      }`}>
                        {ind.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/industries/${ind.id}`}>
                          <Pencil className="size-3.5" /> Edit
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    No industries yet.{" "}
                    <Link href="/admin/industries/new" className="text-brand hover:underline">
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
