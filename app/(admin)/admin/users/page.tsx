import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Profile } from "@/types";
import { UsersTable } from "./users-table";

async function getData() {
  await connection();
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );

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

  const { data: profiles } = await supabase
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
