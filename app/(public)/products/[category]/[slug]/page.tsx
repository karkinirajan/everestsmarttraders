import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Phone,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pickFallbackImage } from "@/lib/image-fallbacks";
import { absoluteUrl, whatsappLink } from "@/lib/utils";
import { dangerousHtml } from "@/lib/sanitize";
import {
  getProductBySlug,
  getSitemapProducts,
  getSiteSettings,
} from "@/lib/supabase/queries";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateStaticParams() {
  const products = await getSitemapProducts();
  return products
    .filter((product) => Boolean(product.category?.[0]?.slug))
    .map((product) => ({
      category: product.category![0].slug,
      slug: product.slug,
    }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const canonicalPath = `/products/${category}/${slug}`;

  return {
    title: `${product.name} | Everest Smart Traders`,
    description:
      product.short_description ??
      `${product.name} — available from Everest Smart Traders, Nepal's trusted automation specialists.`,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: product.cover_image_url
      ? {
          images: [{ url: product.cover_image_url }],
          url: absoluteUrl(canonicalPath),
        }
      : { url: absoluteUrl(canonicalPath) },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;

  const [product, settings] = await Promise.all([
    getProductBySlug(slug),
    getSiteSettings(),
  ]);

  if (!product) notFound();

  const phone = settings.phones?.primary ?? "9860819528";
  const whatsapp = settings.whatsapp ?? phone;
  const fallbackCover =
    product.cover_image_url ?? pickFallbackImage(product.slug, 35);
  const allImages = [
    { url: fallbackCover, alt: product.name },
    ...(product.images ?? []).map((img) => ({
      url: img.url,
      alt: img.alt ?? product.name,
    })),
  ];

  const features = Array.isArray(product.features)
    ? (product.features as string[])
    : [];

  return (
    <div className="py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-2 text-sm text-muted-foreground mb-8"
          aria-label="Breadcrumb"
        >
          <Link
            href="/showcase#products"
            className="hover:text-foreground transition-colors"
          >
            Products
          </Link>
          {product.category && (
            <>
              <span>/</span>
              <Link
                href={`/products/${product.category.slug}`}
                className="hover:text-foreground transition-colors"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground font-medium truncate">
            {product.name}
          </span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Images */}
          <div className="space-y-3">
            <div className="relative aspect-4/3 bg-muted rounded-xl overflow-hidden">
              <Image
                src={allImages[0].url}
                alt={allImages[0].alt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {allImages.slice(1, 5).map((img, i) => (
                  <div
                    key={i}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                  >
                    <Image
                      src={img.url}
                      alt={img.alt}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            {product.category && (
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {product.category.name}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-2 mb-3 leading-tight">
              {product.name}
            </h1>

            {product.is_featured && (
              <Badge variant="amber" className="mb-3">
                Featured
              </Badge>
            )}

            {product.price_range && (
              <p className="text-lg font-semibold text-brand mb-4">
                {product.price_range}
              </p>
            )}

            {product.short_description && (
              <p className="text-muted-foreground leading-relaxed mb-6">
                {product.short_description}
              </p>
            )}

            {/* Features */}
            {features.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                  Key Features
                </h2>
                <ul className="space-y-2">
                  {features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="size-4 text-brand shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
              <Button
                asChild
                size="lg"
                variant="default"
                className="flex-1 sm:flex-none"
              >
                <Link href={`/quote?product=${product.id}`}>
                  Request a Quote
                </Link>
              </Button>
              <Button asChild size="lg" variant="amber">
                <a
                  href={whatsappLink(
                    whatsapp,
                    `Hello, I'm interested in ${product.name}. Can you share more details and pricing?`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={`tel:${phone}`}>
                  <Phone className="size-4" />
                  Call
                </a>
              </Button>
            </div>

            {/* Availability */}
            <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5 text-brand" />
              Available across Nepal — contact us for delivery &amp;
              installation
            </div>
          </div>
        </div>

        {/* Full description */}
        {product.description && (
          <div className="mt-12 pt-8 border-t border-border">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Product Details
            </h2>
            <div
              className="prose prose-est max-w-none"
              dangerouslySetInnerHTML={dangerousHtml(product.description)}
            />
          </div>
        )}

        {/* Specifications */}
        {Array.isArray(product.specifications) &&
          product.specifications.length > 0 && (
            <div className="mt-10 pt-8 border-t border-border">
              <h2 className="text-xl font-semibold text-foreground mb-6">
                Specifications
              </h2>
              <div className="bg-muted/40 border border-border rounded-xl overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <caption className="sr-only">
                    Product specifications for {product.name}
                  </caption>
                  <tbody className="divide-y divide-border/60">
                    {product.specifications.map((spec, i) => (
                      <tr
                        key={i}
                        className={
                          i % 2 === 0 ? "bg-transparent" : "bg-muted/60"
                        }
                      >
                        <th
                          scope="row"
                          className="px-4 sm:px-5 py-3 text-left font-medium text-foreground w-2/5 sm:w-1/3 align-top break-words"
                        >
                          {spec.label}
                        </th>
                        <td className="px-4 sm:px-5 py-3 text-muted-foreground align-top break-words">
                          {spec.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        {/* Back link */}
        <div className="mt-10">
          <Link
            href={
              product.category
                ? `/products/${product.category.slug}`
                : "/showcase#products"
            }
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to {product.category?.name ?? "Products"}
          </Link>
        </div>
      </div>
    </div>
  );
}
