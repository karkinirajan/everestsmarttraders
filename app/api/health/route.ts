import { NextResponse } from "next/server";
import { clientAddress } from "@/lib/client-address";
import { ensureDailyHeartbeat } from "@/lib/keepalive";
import { limiterKey, memoryRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEALTH_LIMIT = { limit: 60, windowMs: 60_000 } as const;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
} as const;

export async function GET(request: Request) {
  const verdict = memoryRateLimit(
    limiterKey("health", clientAddress(request.headers)),
    HEALTH_LIMIT,
  );
  if (!verdict.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          "Retry-After": String(verdict.retryAfter),
        },
      },
    );
  }

  const heartbeat = await ensureDailyHeartbeat("health");
  if (!heartbeat.ok) {
    return NextResponse.json(
      {
        ok: false,
        status: "degraded",
        day: heartbeat.day,
        timestamp: heartbeat.recordedAt,
      },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      status: "healthy",
      day: heartbeat.day,
      tier: heartbeat.tier,
      timestamp: heartbeat.recordedAt,
    },
    { status: 200, headers: NO_STORE_HEADERS },
  );
}
