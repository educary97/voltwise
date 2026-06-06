import { AgentConfig } from "../agentConfig";
import { getSupplierPartnership } from "../supabase";

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
    cashbackPercentage: number;
  };
  estimatedMonthlyBenefit?: number;
  estimatedMonthlyEurAfterBenefit?: number;
}

export interface ComparisonResult {
  shouldSwitch: boolean;
  currentMonthlyCost: number;
  currentMonthlyEffectiveCost: number;
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
 * Calculate monthly cashback benefit from electricity cost
 * If user has supermarket selected and supplier has partnership:
 * benefit = electricity_cost × cashback_percentage / 100
 */
function calculateBenefitFromElectricityCost(
  electricityCost: number,
  cashbackPercentage?: number
): number {
  if (!cashbackPercentage || cashbackPercentage <= 0) return 0;
  return (electricityCost * cashbackPercentage) / 100;
}

function getEffectiveMonthlyEur(
  baseMonthlyEur: number,
  cashbackPercentage?: number
): number {
  const benefit = calculateBenefitFromElectricityCost(baseMonthlyEur, cashbackPercentage);
  return Math.max(0, baseMonthlyEur - benefit);
}

export async function compareToCurrentPlan(
  config: AgentConfig,
  appBaseUrl: string,
  selectedSupermarket?: string
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

      // If user selected a supermarket, check for partnership
      if (selectedSupermarket && selectedSupermarket !== 'None') {
        try {
          const partnership = await getSupplierPartnership(o.provider);
          if (partnership && partnership.supermarket === selectedSupermarket) {
            const cashback = partnership.cashback_percentage || 0;
            offer.supermarketBenefit = {
              supermarket: partnership.supermarket,
              cashbackPercentage: cashback,
            };
            offer.estimatedMonthlyBenefit = calculateBenefitFromElectricityCost(
              offer.estimatedMonthlyEur,
              cashback
            );
            offer.estimatedMonthlyEurAfterBenefit = getEffectiveMonthlyEur(
              offer.estimatedMonthlyEur,
              cashback
            );
          } else {
            offer.estimatedMonthlyEurAfterBenefit = offer.estimatedMonthlyEur;
          }
        } catch (error) {
          offer.estimatedMonthlyEurAfterBenefit = offer.estimatedMonthlyEur;
        }
      } else {
        offer.estimatedMonthlyEurAfterBenefit = offer.estimatedMonthlyEur;
      }

      return offer;
    });

  const enrichedOffers = await Promise.all(allOffers);

  enrichedOffers.sort((a: SupplierOffer, b: SupplierOffer) =>
    (a.estimatedMonthlyEurAfterBenefit ?? a.estimatedMonthlyEur) -
    (b.estimatedMonthlyEurAfterBenefit ?? b.estimatedMonthlyEur)
  );

  const bestOffer = enrichedOffers[0];
  if (!bestOffer) throw new Error("No alternative offers found");

  // Calculate current effective cost with supermarket benefit
  let currentEffectiveCost = config.currentMonthlyCost;
  if (selectedSupermarket && selectedSupermarket !== 'None') {
    try {
      const currentPartnership = await getSupplierPartnership(config.currentSupplier);
      if (currentPartnership && currentPartnership.supermarket === selectedSupermarket) {
        const cashback = currentPartnership.cashback_percentage || 0;
        currentEffectiveCost = getEffectiveMonthlyEur(config.currentMonthlyCost, cashback);
      }
    } catch (error) {
      // Keep original cost if lookup fails
    }
  }

  const bestOfferEffectiveCost = bestOffer.estimatedMonthlyEurAfterBenefit ?? bestOffer.estimatedMonthlyEur;
  const savingsPerMonth = currentEffectiveCost - bestOfferEffectiveCost;
  const savingsPerYear  = savingsPerMonth * 12;
  const shouldSwitch    = savingsPerMonth >= config.switchingThresholdEur;

  return {
    shouldSwitch,
    currentMonthlyCost: config.currentMonthlyCost,
    currentMonthlyEffectiveCost: currentEffectiveCost,
    bestOffer,
    savingsPerMonth,
    savingsPerYear,
    allOffers: enrichedOffers,
  };
}
