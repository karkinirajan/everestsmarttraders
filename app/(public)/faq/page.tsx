import { getFAQs } from "@/lib/supabase/queries";
import { jsonLd } from "@/lib/json-ld";
import { FAQClient } from "./faq-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — Frequently Asked Questions | Everest Smart Traders",
  description:
    "Get answers about gate automation, smart locks, installation process, warranty, and after-sales support from Everest Smart Traders.",
};

export default async function FAQPage() {
  const faqs = await getFAQs();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  // Group by category
  const grouped = faqs.reduce<Record<string, typeof faqs>>((acc, faq) => {
    const cat = faq.category ?? "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-est-amber">
            FAQ
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Everything you need to know about our products, installation, and
            support.
          </p>
        </div>

        {faqs.length > 0 ? (
          <FAQClient grouped={grouped} />
        ) : (
          <p className="text-center text-muted-foreground">
            FAQ content coming soon.
          </p>
        )}
      </div>
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }}
        />
      )}
    </div>
  );
}
