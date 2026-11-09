import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Phone, CheckCircle2 } from "lucide-react";
import { SectionHeader } from "@/components/public/shared/section-header";
import { Button } from "@/components/ui/button";
import { CTABand } from "@/components/public/home/cta-band";
import { pickFallbackImage } from "@/lib/image-fallbacks";
import { getServices, getSiteSettings } from "@/lib/supabase/queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Services — Installation, Maintenance & Support | Everest Smart Traders",
  description:
    "Professional automation installation, annual maintenance contracts, repairs, site surveys, and 24/7 support across Nepal.",
};

export default async function ServicesPage() {
  const [services, settings] = await Promise.all([
    getServices(),
    getSiteSettings(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="bg-brand text-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-est-amber mb-4">
            What We Do
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 text-white">
            Expert Installation &amp; Ongoing Support
          </h1>
          <p className="text-white/75 text-lg max-w-2xl mx-auto">
            From initial site survey to post-installation maintenance, we
            provide end-to-end service for every automation and security system
            we supply.
          </p>
        </div>
      </section>

      {/* Services list */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {services.length > 0 ? (
            <div className="space-y-14">
              {services.map((service, index) => {
                const features = Array.isArray(service.key_benefits)
                  ? (service.key_benefits as string[])
                  : [];

                return (
                  <div
                    key={service.id}
                    id={service.slug}
                    className={`scroll-mt-24 grid lg:grid-cols-2 gap-10 items-center ${
                      index % 2 !== 0 ? "lg:[&>*:first-child]:order-last" : ""
                    }`}
                  >
                    {/* Image */}
                    <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-muted">
                      <Image
                        src={
                          service.cover_image_url ??
                          pickFallbackImage(service.slug, 40)
                        }
                        alt={service.name}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-widest text-est-amber">
                        Service {String(index + 1).padStart(2, "0")}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-2 mb-4">
                        {service.name}
                      </h2>
                      {service.intro && (
                        <p className="text-muted-foreground leading-relaxed mb-5">
                          {service.intro}
                        </p>
                      )}
                      {features.length > 0 && (
                        <ul className="space-y-2 mb-6">
                          {features.slice(0, 5).map((feat, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2.5 text-sm text-muted-foreground"
                            >
                              <CheckCircle2 className="size-4 text-brand shrink-0 mt-0.5" />
                              {feat}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <Button asChild variant="default">
                          <Link href="/contact">
                            Enquire About This
                            <ArrowRight className="size-3.5" />
                          </Link>
                        </Button>
                        <Button asChild variant="outline">
                          <a
                            href={`tel:${settings.phones?.primary ?? "9860819528"}`}
                          >
                            <Phone className="size-4" />
                            Call Us
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              Service details coming soon. Please{" "}
              <Link href="/contact" className="text-brand hover:underline">
                contact us
              </Link>{" "}
              directly.
            </div>
          )}
        </div>
      </section>

      <CTABand settings={settings} />
    </>
  );
}
