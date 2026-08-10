import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";
import { ContentManager } from "./content-manager";

async function getContentData() {
  await connection();
  const supabase = createAdminClient();

  const [sectionsRes, announcementsRes, seoRes] = await Promise.all([
    supabase.from("homepage_sections").select("*").order("position"),
    supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    supabase.from("seo_overrides").select("*").order("path"),
  ]);

  return {
    sections: sectionsRes.data ?? [],
    announcements: announcementsRes.data ?? [],
    seoOverrides: seoRes.data ?? [],
  };
}

export default async function AdminContentPage() {
  await connection();
  const data = await getContentData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Content Manager</h1>
        <p className="text-muted-foreground mt-1">
          Edit homepage sections, announcements, and SEO overrides in one place.
        </p>
      </div>

      <ContentManager
        initialSections={data.sections}
        initialAnnouncements={data.announcements}
        initialSeoOverrides={data.seoOverrides}
      />
    </div>
  );
}
