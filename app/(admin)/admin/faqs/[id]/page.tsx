import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FaqForm } from "../faq-form";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { connection } from "next/server";

interface Props { params: Promise<{ id: string }> }

export default async function EditFaqPage({ params }: Props) {
  const { id } = await params;
  await connection();
  const supabase = createAdminClient();
  const { data: faq } = await supabase
    .from("faqs")
    .select("*")
    .eq("id", id)
    .single();
  if (!faq) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/faqs" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" /> FAQs
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-foreground font-medium line-clamp-1">{faq.question}</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground">Edit FAQ</h1>
      <FaqForm initialData={{
        id: faq.id, question: faq.question, answer: faq.answer,
        category: faq.category, is_published: faq.is_published, position: faq.position,
      }} />
    </div>
  );
}
