/**
 * Supabase data-fetching functions for the public site.
 * These functions are server-only and avoid request-bound APIs like cookies/headers.
 * Per-request deduplication via React `cache()` ensures `PublicLayout`, `generateMetadata`,
 * and page components never issue duplicate database queries within the same render pass.
 */
import { cache } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Product,
  ProductCategory,
  Service,
  Industry,
  Project,
  BlogPost,
  Testimonial,
  FAQ,
  HomepageSection,
  SiteSettingsMap,
  Announcement,
} from "@/types";

type SitemapProduct = {
  slug: string;
  updated_at: string;
  category: { slug: string }[] | null;
};

type SitemapProject = { slug: string; updated_at: string };
type SitemapBlogPost = { slug: string; updated_at: string | null };

// ── Client factory (lazy singleton — avoids build-time errors if env not set) ───────
let cachedClient: SupabaseClient | null = null;
let cachedKeyPair = "";

function getClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return null;
  }
  const pair = `${url}::${key}`;
  if (!cachedClient || cachedKeyPair !== pair) {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedKeyPair = pair;
  }
  return cachedClient;
}

// ── Site Settings ─────────────────────────────────────────────────────────
export const getSiteSettings = cache(
  async (): Promise<Partial<SiteSettingsMap>> => {
    const supabase = getClient();
    if (!supabase) return {};
    const { data } = await supabase.from("site_settings").select("key, value");

    if (!data) return {};

    return Object.fromEntries(
      data.map((row: { key: string; value: unknown }) => [row.key, row.value]),
    ) as Partial<SiteSettingsMap>;
  },
);

// ── Homepage Sections ─────────────────────────────────────────────────────
export const getHomepageSections = cache(
  async (): Promise<HomepageSection[]> => {
    const supabase = getClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("homepage_sections")
      .select("*")
      .eq("is_visible", true)
      .order("position");

    return (data as HomepageSection[]) ?? [];
  },
);

// ── Product Categories ────────────────────────────────────────────────────
export const getProductCategories = cache(
  async (): Promise<ProductCategory[]> => {
    const supabase = getClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("product_categories")
      .select("*")
      .eq("is_active", true)
      .order("position");

    return (data as ProductCategory[]) ?? [];
  },
);

export const getProductCategoryBySlug = cache(
  async (slug: string): Promise<ProductCategory | null> => {
    const supabase = getClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("product_categories")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    return (data as ProductCategory | null) ?? null;
  },
);

// ── Products ──────────────────────────────────────────────────────────────
export const getFeaturedProducts = cache(
  async (limit = 8): Promise<Product[]> => {
    const supabase = getClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("products")
      .select(`*, category:product_categories(*), images:product_images(*)`)
      .eq("is_published", true)
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("position")
      .limit(limit);

    return (data as Product[]) ?? [];
  },
);

export const getProductsByCategory = cache(
  async (categorySlug: string): Promise<Product[]> => {
    const supabase = getClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("products")
      .select(`*, category:product_categories!inner(*), images:product_images(*)`)
      .eq("product_categories.slug", categorySlug)
      .eq("is_published", true)
      .eq("is_active", true)
      .order("position");

    return (data as Product[]) ?? [];
  },
);

export const getProductBySlug = cache(
  async (slug: string): Promise<Product | null> => {
    const supabase = getClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("products")
      .select(`*, category:product_categories(*), images:product_images(*)`)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    return (data as Product | null) ?? null;
  },
);

export async function getAllPublishedProductSlugs(): Promise<string[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("products")
    .select("slug")
    .eq("is_published", true)
    .eq("is_active", true);

  return (data ?? []).map((p: { slug: string }) => p.slug);
}

export async function getAllPublishedProjectSlugs(): Promise<string[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("projects")
    .select("slug")
    .eq("is_published", true);

  return (data ?? []).map((p: { slug: string }) => p.slug);
}

export async function getAllPublishedBlogSlugs(): Promise<string[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("is_published", true);

  return (data ?? []).map((p: { slug: string }) => p.slug);
}

export const getAllPublishedProjects = cache(
  async (limit = 50): Promise<Project[]> => {
    const supabase = getClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("projects")
      .select(`*, industry:industries(*), images:project_images(*)`)
      .eq("is_published", true)
      .order("completed_at", { ascending: false })
      .limit(limit);

    return (data as Project[]) ?? [];
  },
);

export async function getSitemapProducts(): Promise<SitemapProduct[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("products")
    .select("slug, updated_at, category:product_categories(slug)")
    .eq("is_published", true)
    .eq("is_active", true);

  return (data as SitemapProduct[]) ?? [];
}

// ── Services ──────────────────────────────────────────────────────────────
export const getServices = cache(async (): Promise<Service[]> => {
  const supabase = getClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("is_published", true)
    .eq("is_active", true)
    .order("position");

  return (data as Service[]) ?? [];
});

export const getServiceBySlug = cache(
  async (slug: string): Promise<Service | null> => {
    const supabase = getClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    return (data as Service | null) ?? null;
  },
);

// ── Industries ────────────────────────────────────────────────────────────
export const getIndustries = cache(async (): Promise<Industry[]> => {
  const supabase = getClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("industries")
    .select("*")
    .eq("is_active", true)
    .order("position");

  return (data as Industry[]) ?? [];
});

export const getIndustryBySlug = cache(
  async (slug: string): Promise<Industry | null> => {
    const supabase = getClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("industries")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    return (data as Industry | null) ?? null;
  },
);

// ── Projects ──────────────────────────────────────────────────────────────
export const getFeaturedProjects = cache(
  async (limit = 6): Promise<Project[]> => {
    const supabase = getClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("projects")
      .select(`*, industry:industries(*), images:project_images(*)`)
      .eq("is_published", true)
      .eq("is_featured", true)
      .order("completed_at", { ascending: false })
      .limit(limit);

    return (data as Project[]) ?? [];
  },
);

export async function getSitemapProjects(): Promise<SitemapProject[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("projects")
    .select("slug, updated_at")
    .eq("is_published", true);

  return (data as SitemapProject[]) ?? [];
}

export const getProjectBySlug = cache(
  async (slug: string): Promise<Project | null> => {
    const supabase = getClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("projects")
      .select(`
        *,
        industry:industries(*),
        images:project_images(*),
        project_products(product_id)
      `)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    return (data as Project | null) ?? null;
  },
);

// ── Blog Posts ────────────────────────────────────────────────────────────
export const getFeaturedBlogPosts = cache(
  async (limit = 3): Promise<BlogPost[]> => {
    const supabase = getClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("blog_posts")
      .select(`*, category:blog_categories(*)`)
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(limit);

    return (data as BlogPost[]) ?? [];
  },
);

export async function getSitemapBlogPosts(): Promise<SitemapBlogPost[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("blog_posts")
    .select("slug, updated_at")
    .eq("is_published", true);

  return (data as SitemapBlogPost[]) ?? [];
}

export const getBlogPostBySlug = cache(
  async (slug: string): Promise<BlogPost | null> => {
    const supabase = getClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("blog_posts")
      .select(`*, category:blog_categories(*)`)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    return (data as BlogPost | null) ?? null;
  },
);

// ── Testimonials ──────────────────────────────────────────────────────────
export const getFeaturedTestimonials = cache(
  async (limit = 6): Promise<Testimonial[]> => {
    const supabase = getClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("testimonials")
      .select("*")
      .eq("is_published", true)
      .eq("is_featured", true)
      .limit(limit);

    return (data as Testimonial[]) ?? [];
  },
);

// ── FAQs ──────────────────────────────────────────────────────────────────
export const getFAQs = cache(async (category?: string): Promise<FAQ[]> => {
  const supabase = getClient();
  if (!supabase) return [];
  let query = supabase
    .from("faqs")
    .select("*")
    .eq("is_published", true)
    .order("position");

  if (category) {
    query = query.eq("category", category);
  }

  const { data } = await query;
  return (data as FAQ[]) ?? [];
});

// ── Announcements ─────────────────────────────────────────────────────────
export const getActiveAnnouncement = cache(
  async (): Promise<Announcement | null> => {
    const supabase = getClient();
    if (!supabase) return null;
    const nowMs = Date.now();
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const rows = (data as Announcement[] | null) ?? [];
    const active = rows.find((item) => {
      const startsOk = !item.starts_at || Date.parse(item.starts_at) <= nowMs;
      const endsOk = !item.ends_at || Date.parse(item.ends_at) >= nowMs;
      return startsOk && endsOk;
    });
    return active ?? null;
  },
);
