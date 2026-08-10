import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";
import { MediaManager } from "./media-manager";

async function getMediaAssets() {
  await connection();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("media_assets")
    .select("id, filename, url, storage_path, mime_type, size, alt, folder, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

export default async function MediaPage() {
  await connection();
  const assets = await getMediaAssets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Media Library</h1>
        <p className="text-muted-foreground mt-0.5">{assets.length} files uploaded</p>
      </div>
      <MediaManager initialAssets={assets} />
    </div>
  );
}
