// app/api/compare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchOffers, rankOffers } from "@/lib/erse";
import { getRecommendation } from "@/lib/claude";
import { notifyAdmin } from "@/lib/notify";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 45;

const Schema = z.object({
  supplier:             z.string().optional(),
  powerKva:             z.number().min(1).max(42),
  kwhMonth:             z.number().min(1).max(5000),
  currentBill:          z.number().min(1).max(2000),
  tariffType:           z.enum(["simple","bihorario","trihorario"]).default("simple"),
  peakKwh:              z.number().optional(),
  offpeakKwh:           z.number().optional(),
  // Optional detailed bill components
  currentPricePerKwh:   z.number().optional(),
  currentFixedMonthly:  z.number().optional(),
  // Consumption adjustment (0.8 = expect 20% less next month)
  consumptionFactor:    z.number().min(0.3).max(2.0).default(1.0),
});

let usageCount = 0;
const MILESTONES = [10,50,100,250,500,1000];

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  const body = await req.json().catch(()=>null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const {
    supplier, powerKva, kwhMonth, currentBill, tariffType,
    currentPricePerKwh, currentFixedMonthly, consumptionFactor,
  } = parsed.data;

  // Apply consumption adjustment factor
  const adjustedKwh = kwhMonth * consumptionFactor;
  const adjustedBill = currentBill * consumptionFactor;

  const rawOffers = await fetchOffers();
  const offers = rankOffers(rawOffers, {
    powerKva,
    kwhMonth: adjustedKwh,
    tariffType,
    currentBill: adjustedBill,
    currentPricePerKwh,
    currentFixedMonthly,
  });

  const topOffersSummary = offers.slice(0,3).map(o=>({
    provider: o.provider,
    name: o.name,
    monthlyEstimate: o.monthlyEstimate,
    annualSaving: o.annualSaving,
  }));

  let recommendation = "";
  try {
    recommendation = await getRecommendation(
      supplier ?? "", adjustedKwh, powerKva, adjustedBill, topOffersSummary, apiKey
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const isCredits = /credit|insufficient|billing|529|402/i.test(msg);
    notifyAdmin({ type: isCredits ? "api_credits_exhausted" : "api_error", error: msg, endpoint: "/api/compare" }).catch(()=>{});
    const best = offers[0];
    recommendation = `Switching to ${best.provider} ${best.name} could save you approximately €${best.annualSaving.toFixed(0)} per year. In Portugal, switching takes just 5 business days — your new supplier handles all the paperwork.`;
  }

  usageCount++;
  if (MILESTONES.includes(usageCount)) {
    notifyAdmin({ type: "usage_milestone", comparisons: usageCount }).catch(()=>{});
  }

  const best = offers[0];
  return NextResponse.json({
    success: true,
    consumptionFactor,
    adjustedKwh,
    summary: {
      currentAnnualCost:   adjustedBill * 12,
      bestAnnualCost:      best.annualEstimate,
      bestMonthlyEstimate: best.monthlyEstimate,
      potentialSaving:     best.annualSaving,
      savingPercent:       best.savingPercent,
      bestProvider:        best.provider,
      bestOfferName:       best.name,
    },
    recommendation,
    offers: offers.map(o => ({
      id:                    o.id,
      provider:              o.provider,
      name:                  o.name,
      type:                  o.type,
      green:                 o.green,
      tags:                  o.tags,
      contactUrl:            o.contactUrl,
      commercialPricePerKwh: o.commercialPricePerKwh,
      commercialPowerPerDay: o.commercialPowerPerDay,
      firstYearDiscount:     o.firstYearDiscount,
      monthlyEstimate:       o.monthlyEstimate,
      annualEstimate:        o.annualEstimate,
      annualSaving:          o.annualSaving,
      savingPercent:         o.savingPercent,
      breakdown:             o.breakdown,
    })),
    generatedAt: new Date().toISOString(),
  });
}
