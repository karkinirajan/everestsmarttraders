import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/public/shared/product-card";
import { ProjectCard } from "@/components/public/shared/project-card";
import { productSearchFilter, projectSearchFilter } from "@/lib/search";
import { searchQuerySchema } from "@/lib/validations/inquiry";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search | Everest Smart Traders",
  description: "Search Everest Smart Traders products and projects.",
  robots: {
    index: false,
    follow: false,
  },
};

interface SearchProps {
  searchParams: Promise<{ q?: string }>;
}

async function searchContent(query: string) {
  const validated = searchQuerySchema.safeParse({ q: query.trim() });
  if (!validated.success)
    return { products: [], projects: [], services: [] };

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const [productsRes, projectsRes] = await Promise.all([
    supabase
      .from("products")
      .select("*, category:product_categories(*)")
      .eq("is_published", true)
      .eq("is_active", true)
      .or(productSearchFilter(validated.data.q))
      .limit(8),
    supabase
      .from("projects")
      .select("*, industry:industries(*)")
      .eq("is_published", true)
      .or(projectSearchFilter(validated.data.q))
      .limit(6),
  ]);

  return {
    products: productsRes.data ?? [],
    projects: projectsRes.data ?? [],
    services: [],
  };
}

export default async function SearchPage({ searchParams }: SearchProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const results =
    query.length >= 2
      ? await searchContent(query)
      : { products: [], projects: [], services: [] };

  const total = results.products.length + results.projects.length;

  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Search bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <form method="GET" action="/search">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <label htmlFor="site-search" className="sr-only">
                  Search products and projects
                </label>
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="site-search"
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search products, projects, services..."
                  className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  autoFocus
                />
              </div>
              <Button type="submit" variant="amber" className="h-11 px-5">
                Search
              </Button>
            </div>
          </form>
        </div>

        {/* Results */}
        {query.length >= 2 ? (
          total > 0 ? (
            <div className="space-y-12">
              <p className="text-sm text-muted-foreground">
                {total} result{total !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
              </p>

              {results.products.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-5">
                    Products ({results.products.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {results.products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              )}

              {results.projects.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-5">
                    Projects ({results.projects.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {results.projects.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center">
              <Search className="size-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                No results found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-muted-foreground mb-6">
                Try different keywords or browse our categories.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/showcase#products"
                  className="text-sm font-medium text-brand hover:text-est-amber transition-colors"
                >
                  Browse Products →
                </Link>
                <Link
                  href="/contact"
                  className="text-sm font-medium text-brand hover:text-est-amber transition-colors"
                >
                  Contact Us →
                </Link>
              </div>
            </div>
          )
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            <Search className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <p>Enter at least 2 characters to search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
