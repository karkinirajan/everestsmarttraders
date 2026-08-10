import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, MapPin } from "lucide-react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { pickFallbackImage } from "@/lib/image-fallbacks";
import { formatDate } from "@/lib/utils";

async function getAdminProjects() {
  await connection();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("projects")
    .select(
      "id, title, slug, cover_image_url, location, is_published, is_featured, completed_at, industry:industries(name)",
    )
    .order("completed_at", { ascending: false });

  return data ?? [];
}

async function AdminProjectsContent() {
  noStore();
  await connection();
  const projects = await getAdminProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-0.5">
            {projects.length} installations total
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/projects/new">
            <Plus className="size-4" />
            Add Project
          </Link>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-12" />
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Title
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Industry
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  Location
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.length > 0 ? (
                projects.map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="relative size-10 rounded-lg overflow-hidden bg-muted">
                        <Image
                          src={
                            project.cover_image_url ??
                            pickFallbackImage(project.slug, 45)
                          }
                          alt={project.title}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground line-clamp-1">
                        {project.title}
                      </p>
                      {project.completed_at && (
                        <p className="text-xs text-muted-foreground">
                          {formatDate(project.completed_at)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                      {(project.industry as unknown as { name: string } | null)
                        ?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {project.location && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          {project.location}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            project.is_published
                              ? "bg-success-muted text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {project.is_published ? "Published" : "Draft"}
                        </span>
                        {project.is_featured && (
                          <span className="text-xs text-est-amber">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/projects/${project.id}`}>
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
                    No projects yet.{" "}
                    <Link
                      href="/admin/projects/new"
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

export default async function AdminProjectsPage() {
  return (
    <Suspense fallback={null}>
      <AdminProjectsContent />
    </Suspense>
  );
}
