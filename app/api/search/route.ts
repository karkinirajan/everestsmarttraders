import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { clientAddress } from "@/lib/client-address";
import { limiterKey, memoryRateLimit } from "@/lib/rate-limit";
import { productSearchFilter, projectSearchFilter } from "@/lib/search";
import { searchQuerySchema } from "@/lib/validations/inquiry";

// Note: `new URL(request.url).searchParams` is synchronous Web API —
// async searchParams only applies to Next.js page component props, not route handlers.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In memory, per instance: enough to make the limit visible on a public search box (the form routes count in Postgres).
const SEARCH_LIMIT = { limit: 90, windowMs: 60_000 } as const;

export async function GET(request: Request) {
  const verdict = memoryRateLimit(limiterKey("search", clientAddress(request.headers)), SEARCH_LIMIT);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(verdict.retryAfter) } },
    );
  }

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ products: [], projects: [] });
    }

    const validated = searchQuerySchema.safeParse({ q: query });
    if (!validated.success) {
      return NextResponse.json({ products: [], projects: [] }, { status: 200 });
    }

    const supabase = createAdminClient();

    const [productsRes, projectsRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, slug, cover_image_url, price_range, category:product_categories(name, slug)")
        .eq("is_published", true)
        .or(productSearchFilter(validated.data.q))
        .limit(6),
      supabase
        .from("projects")
        .select("id, title, slug, cover_image_url, location, summary")
        .eq("is_published", true)
        .or(projectSearchFilter(validated.data.q))
        .limit(4),
    ]);

    return NextResponse.json({
      products: productsRes.data ?? [],
      projects: projectsRes.data ?? [],
    });
  } catch {
    console.error("[/api/search] Error");
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
