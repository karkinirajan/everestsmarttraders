import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pickFallbackImage } from "@/lib/image-fallbacks";
import {
  absoluteUrl,
  formatDate,
  readingTime,
} from "@/lib/utils";
import { dangerousHtml } from "@/lib/sanitize";
import {
  getBlogPostBySlug,
  getAllPublishedBlogSlugs,
} from "@/lib/supabase/queries";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllPublishedBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return {};

  const canonicalPath = `/blog/${slug}`;

  return {
    title: post.seo_title ?? `${post.title} | Everest Smart Traders`,
    description: post.seo_description ?? post.excerpt ?? undefined,
    alternates: {
      canonical: post.canonical_url ?? canonicalPath,
    },
    openGraph: post.cover_image_url
      ? {
          images: [{ url: post.cover_image_url }],
          url: absoluteUrl(canonicalPath),
        }
      : { url: absoluteUrl(canonicalPath) },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) notFound();
  const coverImage = post.cover_image_url ?? pickFallbackImage(post.slug, 75);

  return (
    <div className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-2 text-sm text-muted-foreground mb-8"
          aria-label="Breadcrumb"
        >
          <Link
            href="/blog"
            className="hover:text-foreground transition-colors"
          >
            Blog
          </Link>
          {post.category && (
            <>
              <span>/</span>
              <span>{post.category.name}</span>
            </>
          )}
          <span>/</span>
          <span className="text-foreground font-medium line-clamp-1">
            {post.title}
          </span>
        </nav>

        {/* Category */}
        {post.category && (
          <Badge variant="default" className="mb-4">
            {post.category.name}
          </Badge>
        )}

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-5 leading-tight">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b border-border">
          {post.published_at && (
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4 text-brand" />
              {formatDate(post.published_at)}
            </span>
          )}
          {post.author_name && <span>By {post.author_name}</span>}
          {post.content && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-brand" />
              {readingTime(post.content)} min read
            </span>
          )}
        </div>

        {/* Cover image */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-muted mb-10">
          <Image
            src={coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
          />
        </div>

        {/* Content */}
        {post.content ? (
          <div
            className="prose prose-est max-w-none"
            dangerouslySetInnerHTML={dangerousHtml(post.content)}
          />
        ) : (
          <p className="text-muted-foreground">Full article coming soon.</p>
        )}

        {/* Tags */}
        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-border flex flex-wrap gap-2">
            {(post.tags as string[]).map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 p-6 bg-brand/5 border border-brand/20 rounded-xl">
          <h3 className="font-semibold text-foreground mb-1.5">
            Interested in our automation products?
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get a free consultation and quote from our team.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="default" size="sm">
              <Link href="/quote">Get a Quote</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/showcase#products">Browse Products</Link>
            </Button>
          </div>
        </div>

        {/* Back */}
        <div className="mt-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Blog
          </Link>
        </div>
      </div>
    </div>
  );
}
