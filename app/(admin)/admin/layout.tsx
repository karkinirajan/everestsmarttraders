import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { AdminShell } from "@/components/admin/shell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify admin/editor role via the service-role client so the gate holds
  // regardless of whether RLS on profiles is enabled/configured — the
  // session check above already proves who the caller is.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "editor"].includes(profile.role)) {
    redirect("/login");
  }

  return (
    <AdminShell
      role={profile.role}
      user={{ email: user.email ?? "", name: profile.full_name }}
    >
      {children}
    </AdminShell>
  );
}
