import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";
import type { Profile } from "@/types";
import { UsersTable } from "./users-table";

async function getData() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Only admins may manage user credentials (editors can use the rest of the dashboard)
  if (me?.role !== "admin") redirect("/admin");

  // Service-role client for the actual list: works whether or not RLS on
  // profiles is configured to let admins read every row.
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, created_at, updated_at")
    .order("created_at", { ascending: true });

  return { profiles: (profiles ?? []) as Profile[], currentUserId: user.id };
}

export default async function UsersPage() {
  await connection();
  const { profiles, currentUserId } = await getData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-0.5">
          {profiles.length} users — manage dashboard login passwords
        </p>
      </div>

      <UsersTable profiles={profiles} currentUserId={currentUserId} />
    </div>
  );
}
