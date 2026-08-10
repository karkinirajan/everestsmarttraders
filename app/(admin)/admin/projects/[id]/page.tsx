import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProjectForm } from "../project-form";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";

interface Props { params: Promise<{ id: string }> }

async function getData(id: string) {
  await connection();
  const admin = createAdminClient();
  const [projectRes, industriesRes] = await Promise.all([
    admin.from("projects").select("*").eq("id", id).single(),
    admin.from("industries").select("id, name").order("position").order("name"),
  ]);
  return { project: projectRes.data, industries: industriesRes.data ?? [] };
}

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  const { project, industries } = await getData(id);
  if (!project) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/projects" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" /> Projects
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-foreground font-medium line-clamp-1">{project.title}</span>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Edit Project</h1>
        <Link href={`/projects/${project.slug}`} target="_blank"
          className="text-sm text-brand hover:text-est-amber transition-colors">
          View on site →
        </Link>
      </div>
      <ProjectForm industries={industries} initialData={{
        id: project.id, title: project.title, slug: project.slug,
        location: project.location, industry_id: project.industry_id,
        summary: project.summary, challenge: project.challenge,
        solution: project.solution, result: project.result,
        cover_image_url: project.cover_image_url,
        is_published: project.is_published, is_featured: project.is_featured,
        completed_at: project.completed_at,
        seo_title: project.seo_title, seo_description: project.seo_description,
      }} />
    </div>
  );
}
