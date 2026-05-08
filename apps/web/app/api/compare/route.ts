// apps/web/app/api/compare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchERSEOffers } from "@voltwise/erse-client/erse-fetcher";
import { rankOffers, type UserInput } from "@voltwise/erse-client/tariff-calculator";
import { generateRecommendation } from "@voltwise/invoice-parser/claude-parser";
import { notifyAdmin } from "@/lib/notify";
import { incrementUsage } from "@/lib/usage";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 45;

const InputSchema = z.object({
  supplier:    z.string().optional(),
  powerKva:    z.number().min(1).max(42),
  kwhMonth:    z.number().min(1).max(5000),
  currentBill: z.number().min(1).max(2000),
  tariffType:  z.enum(["simple", "bihorario", "trihorario"]).default("simple"),
  peakKwh:     z.number().optional(),
  offpeakKwh:  z.number().optional(),
});

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const input: UserInput = {
    powerKva:    parsed.data.powerKva,
    kwhMonth:    parsed.data.kwhMonth,
    tariffType:  parsed.data.tariffType,
    currentBill: parsed.data.currentBill,
    peakKwh:     parsed.data.peakKwh,
    offpeakKwh:  parsed.data.offpeakKwh,
  };

  // Fetch ERSE offers and rank them (no API call — always works)
  const offers = await fetchERSEOffers().then((raw) => rankOffers(raw, input));

  const topOffersSummary = offers.slice(0, 3).map((o) => ({
    provider:        o.provider,
    name:            o.name,
    monthlyEstimate: o.monthlyEstimate,
    annualSaving:    o.annualSaving,
  }));

  // Generate Claude recommendation — catch errors and notify admin
  let recommendation = "";
  try {
    recommendation = await generateRecommendation(
      {
        currentSupplier:    parsed.data.supplier ?? "unknown",
        kwhMonth:           input.kwhMonth,
        powerKva:           input.powerKva,
        currentMonthlyBill: input.currentBill,
        topOffers:          topOffersSummary,
      },
      apiKey
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    const isCreditsError =
      message.toLowerCase().includes("credit") ||
      message.toLowerCase().includes("insufficient") ||
      message.toLowerCase().includes("billing") ||
      message.includes("529") ||
      message.includes("402");

    if (isCreditsError) {
      notifyAdmin({ type: "api_credits_exhausted", error: message, endpoint: "/api/compare" }).catch(() => {});
    } else {
      notifyAdmin({ type: "api_error", error: message, endpoint: "/api/compare" }).catch(() => {});
    }

    // Fallback recommendation — comparison still works, just no Claude text
    const best = offers[0];
    recommendation = `Switching to ${best.provider} ${best.name} could save you approximately €${best.annualSaving.toFixed(0)} per year. In Portugal, switching takes just 5 business days — your new supplier handles all the paperwork with no interruption to supply.`;
  }

  // Track usage (non-blocking)
  incrementUsage().catch(() => {});

  const annualCurrentCost = input.currentBill * 12;
  const bestOffer = offers[0];

  return NextResponse.json({
    success: true,
    summary: {
      currentAnnualCost:   annualCurrentCost,
      bestAnnualCost:      bestOffer.annualEstimate,
      bestMonthlyEstimate: bestOffer.monthlyEstimate,
      potentialSaving:     bestOffer.annualSaving,
      savingPercent:       bestOffer.savingPercent,
      bestProvider:        bestOffer.provider,
      bestOfferName:       bestOffer.name,
    },
    recommendation,
    offers: offers.map((o) => ({
      id:               o.id,
      provider:         o.provider,
      name:             o.name,
      type:             o.type,
      green:            o.green,
      tags:             o.tags,
      contactUrl:       o.contactUrl,
      pricePerKwh:      o.pricePerKwh,
      fixedMonthly:     o.fixedMonthly,
      firstYearDiscount: o.firstYearDiscount,
      monthlyEstimate:  o.monthlyEstimate,
      annualEstimate:   o.annualEstimate,
      annualSaving:     o.annualSaving,
      savingPercent:    o.savingPercent,
      updatedAt:        o.updatedAt,
    })),
    dataSource:  "ERSE Official — simuladorprecos.erse.pt",
    generatedAt: new Date().toISOString(),
  });
}
