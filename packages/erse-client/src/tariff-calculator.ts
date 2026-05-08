// packages/erse-client/src/tariff-calculator.ts
// Official ERSE 2026 grid access tariffs (tarifa de acesso às redes)
// Source: ERSE Diretiva n.º 1/2026, de 7 de janeiro — BTN (Baixa Tensão Normal)

export const GRID_ACCESS_TARIFFS: Record<string, number> = {
  "1.15": 8.18,
  "2.3":  12.20,
  "3.45": 16.22,
  "4.6":  18.24,
  "5.75": 20.14,
  "6.9":  22.98,
  "10.35": 30.12,
  "13.8":  37.26,
  "17.25": 44.40,
  "20.7":  51.54,
};

export const VALID_POWERS = Object.keys(GRID_ACCESS_TARIFFS).map(Number);

export const VAT_RATE = 0.06; // 6% reduced rate for electricity energy component

export interface UserInput {
  powerKva: number;
  kwhMonth: number;
  tariffType: "simple" | "bihorario" | "trihorario";
  peakKwh?: number;
  offpeakKwh?: number;
  currentBill: number; // monthly total including all charges
}

export interface ERSEOffer {
  id: number;
  provider: string;
  name: string;
  type: "fixed" | "indexed";
  green: boolean;
  pricePerKwh: number;         // €/kWh energy component
  fixedMonthly: number;        // €/month commercial fixed charge
  firstYearDiscount: number;   // fraction e.g. 0.20 = 20%
  tags: string[];
  contactUrl: string;
  updatedAt: string;
}

export interface CalculatedOffer extends ERSEOffer {
  monthlyEstimate: number;
  annualEstimate: number;
  annualSaving: number;
  savingPercent: number;
}

export function getGridAccessFee(powerKva: number): number {
  const key = String(powerKva);
  return GRID_ACCESS_TARIFFS[key] ?? GRID_ACCESS_TARIFFS["6.9"];
}

export function calculateMonthlyBill(offer: ERSEOffer, input: UserInput): number {
  const gridFee = getGridAccessFee(input.powerKva);
  const energyCost = input.kwhMonth * offer.pricePerKwh;
  const fixedCharge = offer.fixedMonthly;

  let subtotal = gridFee + energyCost + fixedCharge;

  // Apply first-year discount (typically on energy + fixed, not grid tariff)
  if (offer.firstYearDiscount > 0) {
    const discountBase = energyCost + fixedCharge;
    subtotal = gridFee + discountBase * (1 - offer.firstYearDiscount);
  }

  // IVA 6% on energy component, 23% on grid access (simplified: 6% blended)
  return subtotal * (1 + VAT_RATE);
}

export function rankOffers(offers: ERSEOffer[], input: UserInput): CalculatedOffer[] {
  const annualCurrentCost = input.currentBill * 12;

  return offers
    .map((offer) => {
      const monthlyEstimate = calculateMonthlyBill(offer, input);
      const annualEstimate = monthlyEstimate * 12;
      const annualSaving = annualCurrentCost - annualEstimate;
      const savingPercent = (annualSaving / annualCurrentCost) * 100;
      return { ...offer, monthlyEstimate, annualEstimate, annualSaving, savingPercent };
    })
    .sort((a, b) => a.monthlyEstimate - b.monthlyEstimate);
}
