// src/lib/agent/compareToCurrentPlan.ts
// Fetches the latest ERSE offers and compares against the user's current plan

import { AgentConfig } from "../agentConfig";

export interface SupplierOffer {
  supplier: string;
  plan: string;
  estimatedMonthlyEur: number;
  tariffType: "fixed" | "indexed" | "green";
  contractUrl?: string;
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

// Known supplier contact emails for switching requests (best-effort)
const SUPPLIER_EMAILS: Record<string, string> = {
  "Galp": "particulares@galp.com",
  "Endesa": "clientes@endesa.es",
  "Iberdrola": "iberdrola.pt@iberdrola.com",
  "Goldenergy": "geral@goldenergy.pt",
  "Muon": "geral@muon.pt",
  "Coopernico": "info@coopernico.org",
  "Luzboa": "geral@luzboa.pt",
  "SU Electricidade": "geral@suelectricidade.pt",
};

export async function compareToCurrentPlan(
  config: AgentConfig,
  appBaseUrl: string
): Promise<ComparisonResult> {
  // Fetch latest offers from the existing Voltwise API
  const offersRes = await fetch(`${appBaseUrl}/api/offers?kwh=${config.currentMonthlyKwh}`);

  if (!offersRes.ok) {
    throw new Error(`Failed to fetch offers: ${offersRes.status} ${offersRes.statusText}`);
  }

  const offersData = await offersRes.json();

  // Normalize offers from the existing API shape
  // Adjust this mapping to match your actual /api/offers response shape
  const allOffers: SupplierOffer[] = (offersData.offers ?? offersData).map((o: any) => ({
    supplier: o.supplier ?? o.name,
    plan: o.plan ?? o.tariff ?? o.planName ?? "Standard",
    estimatedMonthlyEur: o.estimatedMonthly ?? o.monthlyTotal ?? o.totalMonthly,
    tariffType: o.tariffType ?? o.type ?? "fixed",
    contractUrl: o.contractUrl ?? o.url,
    supplierEmail: SUPPLIER_EMAILS[o.supplier ?? o.name],
  }));

  // Sort by cost ascending, exclude current supplier
  const alternatives = allOffers
    .filter((o) => o.supplier !== config.currentSupplier)
    .sort((a, b) => a.estimatedMonthlyEur - b.estimatedMonthlyEur);

  const bestOffer = alternatives[0];

  if (!bestOffer) {
    throw new Error("No alternative supplier offers found");
  }

  const savingsPerMonth = config.currentMonthlyCost - bestOffer.estimatedMonthlyEur;
  const savingsPerYear = savingsPerMonth * 12;
  const shouldSwitch = savingsPerMonth >= config.switchingThresholdEur;

  return {
    shouldSwitch,
    currentMonthlyCost: config.currentMonthlyCost,
    bestOffer,
    savingsPerMonth,
    savingsPerYear,
    allOffers,
  };
}
