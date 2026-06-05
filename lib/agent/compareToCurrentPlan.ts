import { AgentConfig } from "../agentConfig";
import { getSupplierPartnership } from "../partnerships/monitor";

export interface SupplierOffer {
  supplier: string;
  plan: string;
  estimatedMonthlyEur: number;
  directUrl?: string;
  tariffType: "fixed" | "indexed";
  contactUrl?: string;
  supplierEmail?: string;
  supermarketBenefit?: {
    supermarket: string;
    cashbackPercentage?: number;
    fixedMonthlyEur?: number;
  };
  estimatedMonthlyBenefit?: number;
  estimatedMonthlyEurAfterBenefit?: number;
}

export interface ComparisonResult {
  shouldSwitch: boolean;
  currentMonthlyCost: number;
  bestOffer: SupplierOffer;
  savingsPerMonth: number;
  savingsPerYear: number;
  allOffers: SupplierOffer[];
}

const SUPPLIER_EMAILS: Record<string, string> = {
  "EDP":        "particulares@edp.pt",
  "Endesa":     "clientes@endesa.pt",
  "Galp":       "particulares@galp.com",
  "Goldenergy": "geral@goldenergy.pt",
  "Iberdrola":  "iberdrola.pt@iberdrola.com",
  "Repsol":     "geral@repsol.pt",
  "Plenitude":  "info@plenitude.com",
  "MUON":       "geral@muon.energy",
};

/**
 * Calculate estimated monthly supermarket benefit
 */
function calculateMonthlyBenefit(
  supermarketBenefit?: { cashbackPercentage?: number; fixedMonthlyEur?: number; estimatedMonthlySpending?: number }
): number {
  if (!supermarketBenefit) return 0;
  if (supermarketBenefit.fixedMonthlyEur) {
    return supermarketBenefit.fixedMonthlyEur;
  }
  if (supermarketBenefit.cashbackPercentage && supermarketBenefit.estimatedMonthlySpending) {
    return (supermarketBenefit.estimatedMonthlySpending * supermarketBenefit.cashbackPercentage) / 100;
  }
  return 0;
}

/**
 * Calculate effective cost after benefits
 */
function getEffectiveMonthlyEur(
  baseMonthlyEur: number,
  supermarketBenefit?: { cashbackPercentage?: number; fixedMonthlyEur?: number; estimatedMonthlySpending?: number }
): number {
  const benefit = calculateMonthlyBenefit(supermarketBenefit);
  return Math.max(0, baseMonthlyEur - benefit);
}

export async function compareToCurrentPlan(
  config: AgentConfig,
  appBaseUrl: string
): Promise<ComparisonResult> {
  const res = await fetch(`${appBaseUrl}/api/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      supplier:    config.currentSupplier,
      powerKva:    6.9,
      kwhMonth:    config.currentMonthlyKwh,
      currentBill: config.currentMonthlyCost,
      tariffType:  "simple",
      currentSupermarketBenefit: config.currentSupermarketBenefit,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch offers: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  const allOffers: SupplierOffer[] = (data.offers ?? [])
    .filter((o: any) => o.provider !== config.currentSupplier)
    .map(async (o: any) => {
      const offer: SupplierOffer = {
        supplier:            o.provider,
        plan:                o.name,
        estimatedMonthlyEur: o.monthlyEstimate,
        tariffType:          o.type,
        contactUrl:          o.contactUrl,
        supplierEmail:       SUPPLIER_EMAILS[o.provider],
      };

      // Try to fetch partnership from Supabase
      try {
        const partnership = await getSupplierPartnership(o.provider);
        if (partnership && config.currentSupermarketBenefit?.estimatedMonthlySpending) {
          offer.supermarketBenefit = {
            supermarket: partnership.supermarket,
            cashbackPercentage: partnership.cashback_percentage ?? undefined,
            fixedMonthlyEur: partnership.fixed_monthly_eur ?? undefined,
          };
          offer.estimatedMonthlyBenefit = calculateMonthlyBenefit({
            cashbackPercentage: partnership.cashback_percentage ?? undefined,
            fixedMonthlyEur: partnership.fixed_monthly_eur ?? undefined,
            estimatedMonthlySpending: config.currentSupermarketBenefit.estimatedMonthlySpending,
          });
          offer.estimatedMonthlyEurAfterBenefit = getEffectiveMonthlyEur(
            offer.estimatedMonthlyEur,
            {
              cashbackPercentage: partnership.cashback_percentage ?? undefined,
              fixedMonthlyEur: partnership.fixed_monthly_eur ?? undefined,
              estimatedMonthlySpending: config.currentSupermarketBenefit.estimatedMonthlySpending,
            }
          );
        } else {
          offer.estimatedMonthlyEurAfterBenefit = offer.estimatedMonthlyEur;
        }
      } catch (error) {
        // Supabase not available, use base cost
        offer.estimatedMonthlyEurAfterBenefit = offer.estimatedMonthlyEur;
      }

      return offer;
    });

  // Wait for all offers to be enriched with partnership data
  const enrichedOffers = await Promise.all(allOffers);

  // Sort by effective cost
  enrichedOffers.sort((a: SupplierOffer, b: SupplierOffer) =>
    (a.estimatedMonthlyEurAfterBenefit ?? a.estimatedMonthlyEur) -
    (b.estimatedMonthlyEurAfterBenefit ?? b.estimatedMonthlyEur)
  );

  const bestOffer = enrichedOffers[0];
  if (!bestOffer) throw new Error("No alternative offers found");

  // Calculate current effective cost
  const currentEffectiveCost = getEffectiveMonthlyEur(
    config.currentMonthlyCost,
    config.currentSupermarketBenefit
  );

  const bestOfferEffectiveCost = bestOffer.estimatedMonthlyEurAfterBenefit ?? bestOffer.estimatedMonthlyEur;
  const savingsPerMonth = currentEffectiveCost - bestOfferEffectiveCost;
  const savingsPerYear  = savingsPerMonth * 12;
  const shouldSwitch    = savingsPerMonth >= config.switchingThresholdEur;

  return {
    shouldSwitch,
    currentMonthlyCost: currentEffectiveCost,
    bestOffer,
    savingsPerMonth,
    savingsPerYear,
    allOffers: enrichedOffers,
  };
}
