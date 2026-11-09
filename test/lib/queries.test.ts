import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshFake, holder } from "../helpers/mocks";

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => holder.fake.from(table),
  }),
}));

const queries = await import("@/lib/supabase/queries");

beforeEach(() => {
  freshFake();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
});

describe("lib/supabase/queries", () => {
  it("maps getSiteSettings rows into a key-value record and handles empty results", async () => {
    holder.fake.answer("site_settings", {
      data: [
        { key: "site_name", value: "Everest Smart Traders" },
        { key: "whatsapp", value: "9851336266" },
      ],
      error: null,
    });

    const settings = await queries.getSiteSettings();
    expect(settings.site_name).toBe("Everest Smart Traders");
    expect(settings.whatsapp).toBe("9851336266");
  });

  it("filters active announcements by starts_at and ends_at window in getActiveAnnouncement", async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    holder.fake.answer("announcements", {
      data: [
        {
          id: "expired",
          message: "Old promo",
          link: null,
          link_label: null,
          type: "info",
          is_active: true,
          starts_at: null,
          ends_at: past,
          created_at: past,
        },
        {
          id: "current",
          message: "Dashain Offer",
          link: "/contact",
          link_label: "Book Now",
          type: "success",
          is_active: true,
          starts_at: past,
          ends_at: future,
          created_at: past,
        },
      ],
      error: null,
    });

    const active = await queries.getActiveAnnouncement();
    expect(active?.id).toBe("current");
  });

  it("returns products, categories, projects, services, industries, testimonials, faqs, and blog posts", async () => {
    holder.fake.setDefault({ data: [], error: null });

    expect(await queries.getProductCategories()).toEqual([]);
    expect(await queries.getProductCategoryBySlug("gate")).toEqual([]);
    expect(await queries.getProductsByCategory("gate")).toEqual([]);
    expect(await queries.getFeaturedProducts(4)).toEqual([]);
    expect(await queries.getProductBySlug("bx74")).toEqual([]);
    expect(await queries.getAllPublishedProductSlugs()).toEqual([]);
    expect(await queries.getAllPublishedProjectSlugs()).toEqual([]);
    expect(await queries.getAllPublishedBlogSlugs()).toEqual([]);
    expect(await queries.getAllPublishedProjects(10)).toEqual([]);
    expect(await queries.getServices()).toEqual([]);
    expect(await queries.getServiceBySlug("install")).toEqual([]);
    expect(await queries.getIndustries()).toEqual([]);
    expect(await queries.getIndustryBySlug("hotels")).toEqual([]);
    expect(await queries.getFeaturedProjects(3)).toEqual([]);
    expect(await queries.getProjectBySlug("hotel-yak")).toEqual([]);
    expect(await queries.getFeaturedBlogPosts(3)).toEqual([]);
    expect(await queries.getBlogPostBySlug("guide")).toEqual([]);
    expect(await queries.getFeaturedTestimonials(4)).toEqual([]);
    expect(await queries.getFAQs("General")).toEqual([]);
    expect(await queries.getHomepageSections()).toEqual([]);
    expect(await queries.getSitemapProducts()).toEqual([]);
    expect(await queries.getSitemapBlogPosts()).toEqual([]);
    expect(await queries.getSitemapProjects()).toEqual([]);
  });
});
