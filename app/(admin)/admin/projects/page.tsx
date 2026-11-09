import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, MapPin } from "lucide-react";
import { Suspense } from "react";
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-0.5">
            {projects.length} installations total
          </p>
        </div>
        <Button asChild size="sm" className="self-start sm:self-auto">
          <Link href="/admin/projects/new">
            <Plus className="size-4" />
            Add Project
          </Link>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden sm:table-cell">Industry</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length > 0 ? (
              projects.map((project) => {
                const industryName =
                  (project.industry as unknown as { name: string } | null)
                    ?.name ?? null;
                return (
                  <TableRow key={project.id}>
                    <TableCell className="w-14">
                      <div className="relative size-10 rounded-lg overflow-hidden bg-muted shrink-0 border border-border/60">
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
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/projects/${project.id}`}
                        className="font-medium text-foreground hover:text-brand transition-colors line-clamp-1"
                      >
                        {project.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                        {project.completed_at && (
                          <span>{formatDate(project.completed_at)}</span>
                        )}
                        {industryName && (
                          <span className="sm:hidden">· {industryName}</span>
                        )}
                        {project.location && (
                          <span className="md:hidden">· {project.location}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {industryName ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {project.location ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          {project.location}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant={project.is_published ? "success" : "muted"}
                        >
                          {project.is_published ? "Published" : "Draft"}
                        </Badge>
                        {project.is_featured && (
                          <Badge variant="amber">Featured</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="xs">
                          <Link href={`/admin/projects/${project.id}`}>
                            <Pencil className="size-3.5" />
                            Edit
                          </Link>
                        </Button>
                        <DeleteItemButton
                          table="projects"
                          id={project.id}
                          label={project.title}
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
                  No projects yet.{" "}
                  <Link
                    href="/admin/projects/new"
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

export default async function AdminProjectsPage() {
  return (
    <Suspense fallback={null}>
      <AdminProjectsContent />
    </Suspense>
  );
}
