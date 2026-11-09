import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pickFallbackImage } from "@/lib/image-fallbacks";
import { absoluteUrl, formatDate } from "@/lib/utils";
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

  const canonicalPath = `/tutorials/${slug}`;

  return {
    title: post.seo_title ?? `${post.title} | Everest Smart Traders`,
    description: post.seo_description ?? post.excerpt ?? undefined,
    robots: {
      index: false,
      follow: true,
    },
    alternates: { canonical: post.canonical_url ?? `/blog/${slug}` },
    openGraph: post.cover_image_url
      ? {
          images: [{ url: post.cover_image_url }],
          url: absoluteUrl(canonicalPath),
        }
      : { url: absoluteUrl(canonicalPath) },
  };
}

export default async function TutorialDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const thumbnail = post.cover_image_url ?? pickFallbackImage(post.slug, 75);

  return (
    <div className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-2 text-sm text-muted-foreground mb-8"
          aria-label="Breadcrumb"
        >
          <Link
            href="/tutorials"
            className="hover:text-foreground transition-colors"
          >
            Tutorials
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
          {post.reading_time && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-brand" />
              {post.reading_time} min
            </span>
          )}
          {post.video_url && (
            <span className="flex items-center gap-1.5 text-brand font-medium">
              <PlayCircle className="size-4" />
              Video tutorial
            </span>
          )}
        </div>

        {/* ── Video Player (primary) ── */}
        {post.video_url ? (
          <div className="mb-10 rounded-xl overflow-hidden bg-black shadow-lg">
            <video
              controls
              className="w-full"
              poster={post.cover_image_url ?? undefined}
              preload="metadata"
            >
              <source src={post.video_url} type="video/mp4" />
              Your browser does not support HTML5 video.
            </video>
          </div>
        ) : (
          /* Fallback thumbnail if no video */
          <div className="relative aspect-video rounded-xl overflow-hidden bg-muted mb-10">
            <Image
              src={thumbnail}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* ── Tutorial Content ── */}
        {post.content ? (
          <div
            className="prose prose-est max-w-none"
            dangerouslySetInnerHTML={dangerousHtml(post.content)}
          />
        ) : (
          <p className="text-muted-foreground">Tutorial content coming soon.</p>
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
            Ready to install? Get a free site survey.
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Our team will assess your site and recommend the right system for
            your needs.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="default" size="sm">
              <Link href="/quote">Request a Quote</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/showcase#products">Browse Products</Link>
            </Button>
          </div>
        </div>

        {/* Back */}
        <div className="mt-10">
          <Link
            href="/tutorials"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            All Tutorials
          </Link>
        </div>
      </div>
    </div>
  );
}
