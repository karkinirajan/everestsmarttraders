import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ServiceForm } from "../service-form";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditServicePage({ params }: Props) {
  const { id } = await params;
  await connection();
  const supabase = createAdminClient();
  const { data: svc } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .single();
  if (!svc) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/services"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Services
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-foreground font-medium line-clamp-1">
          {svc.name}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Edit Service</h1>
        <Link
          href={`/services/${svc.slug}`}
          target="_blank"
          className="text-sm text-brand hover:text-est-amber transition-colors"
        >
          View on site →
        </Link>
      </div>
      <ServiceForm
        initialData={{
          id: svc.id,
          name: svc.name,
          slug: svc.slug,
          intro: svc.intro,
          description: svc.description,
          key_benefits: Array.isArray(svc.key_benefits) ? svc.key_benefits : [],
          icon: svc.icon,
          cover_image_url: svc.cover_image_url,
          is_active: svc.is_active,
          is_published: svc.is_published,
          position: svc.position,
        }}
      />
    </div>
  );
}
