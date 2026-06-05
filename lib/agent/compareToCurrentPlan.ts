import { AgentConfig } from "../agentConfig";

export interface SupplierOffer {
  supplier: string;
  plan: string;
  estimatedMonthlyEur: number;
  tariffType: "fixed" | "indexed";
  contactUrl?: string;
  supplierEmail?: string;
  supermarketBenefit?: {
    supermarket: string;
    cashbackPercentage?: number;
    fixedMonthlyEur?: number;
    estimatedMonthlyBenefit?: number; // calculated benefit in EUR
  };
  estimatedMonthlyEurAfterBenefit?: number; // effective cost after cashback
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
 * Calculate estimated monthly supermarket benefit (cashback/discount in EUR)
 * Requires: monthly spending estimate and either cashback % or fixed amount
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
 * Calculate effective monthly cost after factoring in supermarket benefits
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
      // Include current supermarket benefit context
      currentSupermarketBenefit: config.currentSupermarketBenefit,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch offers: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Map known supermarket benefits for major suppliers
  const knownSupermarketBenefits: Record<string, { supermarket: string; cashbackPercentage?: number; fixedMonthlyEur?: number }> = {
    "EDP":        { supermarket: "Pingo Doce", cashbackPercentage: 2.5 }, // Example: EDP launched Pingo Doce partnership
    "Endesa":     { supermarket: "Continente", cashbackPercentage: 2.0 },
    "Galp":       { supermarket: "Continente", cashbackPercentage: 1.5 },
  };

  const allOffers: SupplierOffer[] = (data.offers ?? [])
    .filter((o: any) => o.provider !== config.currentSupplier)
    .map((o: any) => {
      const offer: SupplierOffer = {
        supplier:            o.provider,
        plan:                o.name,
        estimatedMonthlyEur: o.monthlyEstimate,
        tariffType:          o.type,
        contactUrl:          o.contactUrl,
        supplierEmail:       SUPPLIER_EMAILS[o.provider],
      };

      // Add known supermarket benefits
      const benefit = knownSupermarketBenefits[o.provider];
      if (benefit && config.currentSupermarketBenefit?.estimatedMonthlySpending) {
        offer.supermarketBenefit = benefit;
        offer.estimatedMonthlyBenefit = calculateMonthlyBenefit({
          ...benefit,
          estimatedMonthlySpending: config.currentSupermarketBenefit.estimatedMonthlySpending,
        });
        offer.estimatedMonthlyEurAfterBenefit = getEffectiveMonthlyEur(
          offer.estimatedMonthlyEur,
          {
            ...benefit,
            estimatedMonthlySpending: config.currentSupermarketBenefit.estimatedMonthlySpending,
          }
        );
      } else {
        offer.estimatedMonthlyEurAfterBenefit = offer.estimatedMonthlyEur;
      }

      return offer;
    })
    // Sort by effective cost (after benefits)
    .sort((a: SupplierOffer, b: SupplierOffer) => 
      (a.estimatedMonthlyEurAfterBenefit ?? a.estimatedMonthlyEur) - 
      (b.estimatedMonthlyEurAfterBenefit ?? b.estimatedMonthlyEur)
    );

  const bestOffer = allOffers[0];
  if (!bestOffer) throw new Error("No alternative offers found");

  // Calculate current effective cost (with your current benefit)
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
    currentMonthlyCost: currentEffectiveCost, // Now reflects effective cost with benefits
    bestOffer,
    savingsPerMonth,
    savingsPerYear,
    allOffers,
  };
}