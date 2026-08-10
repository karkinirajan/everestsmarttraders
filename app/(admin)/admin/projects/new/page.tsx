import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProjectForm } from "../project-form";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";

async function getIndustries() {
  await connection();
  const admin = createAdminClient();
  const { data } = await admin
    .from("industries")
    .select("id, name")
    .order("position")
    .order("name");
  return data ?? [];
}

export default async function NewProjectPage() {
  const industries = await getIndustries();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/projects"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Projects
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-foreground font-medium">New Project</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground">Add Installation</h1>
      <ProjectForm industries={industries} />
    </div>
  );
}
