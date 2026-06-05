import { AgentConfig } from "../agentConfig";

export interface SupplierOffer {
  supplier: string;
  plan: string;
  estimatedMonthlyEur: number;
  tariffType: "fixed" | "indexed";
  contactUrl?: string;
  supplierEmail?: string;
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
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch offers: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  const allOffers: SupplierOffer[] = (data.offers ?? [])
    .filter((o: any) => o.provider !== config.currentSupplier)
    .map((o: any) => ({
      supplier:            o.provider,
      plan:                o.name,
      estimatedMonthlyEur: o.monthlyEstimate,
      tariffType:          o.type,
      contactUrl:          o.contactUrl,
      supplierEmail:       SUPPLIER_EMAILS[o.provider],
    }))
    .sort((a: SupplierOffer, b: SupplierOffer) => a.estimatedMonthlyEur - b.estimatedMonthlyEur);

  const bestOffer = allOffers[0];
  if (!bestOffer) throw new Error("No alternative offers found");

  const savingsPerMonth = config.currentMonthlyCost - bestOffer.estimatedMonthlyEur;
  const savingsPerYear  = savingsPerMonth * 12;
  const shouldSwitch    = savingsPerMonth >= config.switchingThresholdEur;

  return {
    shouldSwitch,
    currentMonthlyCost: config.currentMonthlyCost,
    bestOffer,
    savingsPerMonth,
    savingsPerYear,
    allOffers,
  };
}