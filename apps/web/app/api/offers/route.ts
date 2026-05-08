// apps/web/app/api/offers/route.ts
// GET /api/offers?power=6.9&kwh=300&bill=78
// Returns ranked offers for the given inputs. Cached at edge for 6 hours.

import { NextRequest, NextResponse } from "next/server";
import { fetchERSEOffers } from "@voltwise/erse-client/erse-fetcher";
import { rankOffers } from "@voltwise/erse-client/tariff-calculator";

export const runtime = "edge";
export const revalidate = 21600; // 6 hours

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const powerKva    = parseFloat(searchParams.get("power") ?? "6.9");
  const kwhMonth    = parseFloat(searchParams.get("kwh") ?? "300");
  const currentBill = parseFloat(searchParams.get("bill") ?? "75");
  const tariffType  = (searchParams.get("tariff") ?? "simple") as "simple" | "bihorario" | "trihorario";

  if (isNaN(powerKva) || isNaN(kwhMonth) || isNaN(currentBill)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const raw    = await fetchERSEOffers();
  const offers = rankOffers(raw, { powerKva, kwhMonth, tariffType, currentBill });

  return NextResponse.json(
    { offers, count: offers.length, cachedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "s-maxage=21600, stale-while-revalidate=3600" } }
  );
}
