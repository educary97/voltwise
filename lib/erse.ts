// lib/erse.ts — ERSE tariff calculator + offer database
// Updated with 2026 ERSE-approved network access tariffs (Diretiva n.º 1/2026)

// ─── 2026 ERSE Network Access Tariffs (TAR) ──────────────────────────────────
// Source: EDP tariff sheet based on ERSE Diretiva n.º 1/2026, 7 January 2026
// These are the SAME for every supplier — fixed by ERSE, not negotiable
// Simple tariff (Tarifa Simples BTN)

export interface TAREntry {
  powerPerDay: number;   // €/day — charged at 23% VAT (except ≤3.45 kVA at 6%)
  energyPerKwh: number;  // €/kWh — grid access portion of energy cost
}

// Network access tariff by kVA (simple tariff, 2026)
export const TAR_2026: Record<string, TAREntry> = {
  "1.15":  { powerPerDay: 0.0524, energyPerKwh: 0.0150 },
  "2.3":   { powerPerDay: 0.0524, energyPerKwh: 0.0150 },
  "3.45":  { powerPerDay: 0.0524, energyPerKwh: 0.0150 },
  "4.6":   { powerPerDay: 0.0412, energyPerKwh: 0.0158 },
  "5.75":  { powerPerDay: 0.0412, energyPerKwh: 0.0158 },
  "6.9":   { powerPerDay: 0.0412, energyPerKwh: 0.0158 },
  "10.35": { powerPerDay: 0.0412, energyPerKwh: 0.0158 },
  "13.8":  { powerPerDay: 0.0412, energyPerKwh: 0.0158 },
  "17.25": { powerPerDay: 0.0412, energyPerKwh: 0.0158 },
  "20.7":  { powerPerDay: 0.0412, energyPerKwh: 0.0158 },
};

// Fixed taxes — same for everyone, don't affect comparison but improve accuracy
export const FIXED_TAXES = {
  dgeg: 0.07,           // €/month (Taxa DGEG)
  audiovisual: 2.85,    // €/month (Contribuição Audiovisual)
  ispePerKwh: 0.001,    // €/kWh (ISPE — Imposto Especial sobre Consumo de Eletricidade)
};

// VAT rates
export const VAT = {
  energy: 0.06,         // 6% on energy (kWh consumption)
  fixed: 0.23,          // 23% on power/fixed charges (>3.45 kVA)
  fixedReduced: 0.06,   // 6% on power/fixed charges (≤3.45 kVA)
};

export interface ERSEOffer {
  id: number;
  provider: string;
  name: string;
  type: "fixed" | "indexed";
  green: boolean;
  commercialPricePerKwh: number;   // €/kWh — commercial portion only (excl. TAR)
  commercialPowerPerDay: number;   // €/day — commercial fixed charge (excl. TAR)
  firstYearDiscount: number;       // fraction e.g. 0.20 = 20%
  tags: string[];
  contactUrl: string;
}

export interface CalculatedOffer extends ERSEOffer {
  // Monthly breakdown
  gridAccessMonthly: number;     // TAR power + TAR energy (before VAT)
  commercialMonthly: number;     // commercial energy + commercial fixed (before VAT)
  taxesMonthly: number;          // DGEG + Audiovisual + ISPE
  vatMonthly: number;            // total VAT
  monthlyEstimate: number;       // total after VAT and taxes
  annualEstimate: number;
  annualSaving: number;
  savingPercent: number;
  // Component breakdown for display
  breakdown: {
    powerFixed: number;          // total fixed/power charge after VAT
    energyVariable: number;      // total energy charge after VAT
    taxes: number;               // taxes
  };
}

export interface UserInput {
  powerKva: number;
  kwhMonth: number;
  tariffType: string;
  currentBill: number;
  // Optional detailed components from bill
  currentPricePerKwh?: number;
  currentFixedMonthly?: number;
}

export function calcMonthly(offer: ERSEOffer, input: UserInput): CalculatedOffer {
  const kva   = String(input.powerKva);
  const tar   = TAR_2026[kva] ?? TAR_2026["6.9"];
  const days  = 30.44; // average days per month
  const kwh   = input.kwhMonth;

  // Determine VAT rate on fixed/power charges
  const fixedVat = input.powerKva <= 3.45 ? VAT.fixedReduced : VAT.fixed;

  // --- Grid access (TAR) — same for all suppliers ---
  const tarPowerPreVat  = tar.powerPerDay * days;
  const tarEnergyPreVat = tar.energyPerKwh * kwh;
  const gridAccessMonthly = tarPowerPreVat * (1 + fixedVat) + tarEnergyPreVat * (1 + VAT.energy);

  // --- Commercial charges (vary by supplier) ---
  let commPower  = offer.commercialPowerPerDay * days;
  let commEnergy = offer.commercialPricePerKwh * kwh;

  // Apply first year discount to commercial portion only
  if (offer.firstYearDiscount > 0) {
    commPower  *= (1 - offer.firstYearDiscount);
    commEnergy *= (1 - offer.firstYearDiscount);
  }

  const commPowerWithVat  = commPower  * (1 + fixedVat);
  const commEnergyWithVat = commEnergy * (1 + VAT.energy);
  const commercialMonthly = commPowerWithVat + commEnergyWithVat;

  // --- Fixed taxes ---
  const ispe = FIXED_TAXES.ispePerKwh * kwh;
  const taxesMonthly = (FIXED_TAXES.dgeg + FIXED_TAXES.audiovisual + ispe) * (1 + VAT.fixed);

  // --- Totals ---
  const monthlyEstimate = gridAccessMonthly + commercialMonthly + taxesMonthly;
  const vatMonthly = (tarPowerPreVat + commPower) * fixedVat +
                     (tarEnergyPreVat + commEnergy) * VAT.energy +
                     (FIXED_TAXES.dgeg + FIXED_TAXES.audiovisual + ispe) * VAT.fixed;

  // --- Breakdown for display ---
  const breakdown = {
    powerFixed:     tarPowerPreVat * (1 + fixedVat) + commPowerWithVat,
    energyVariable: tarEnergyPreVat * (1 + VAT.energy) + commEnergyWithVat,
    taxes:          taxesMonthly,
  };

  const annualEstimate = monthlyEstimate * 12;
  const annualSaving   = input.currentBill * 12 - annualEstimate;

  return {
    ...offer,
    gridAccessMonthly,
    commercialMonthly,
    taxesMonthly,
    vatMonthly,
    monthlyEstimate,
    annualEstimate,
    annualSaving,
    savingPercent: (annualSaving / (input.currentBill * 12)) * 100,
    breakdown,
  };
}

export function rankOffers(offers: ERSEOffer[], input: UserInput): CalculatedOffer[] {
  return offers
    .map(o => calcMonthly(o, input))
    .sort((a, b) => a.monthlyEstimate - b.monthlyEstimate);
}

export async function fetchOffers(): Promise<ERSEOffer[]> {
  try {
    const res = await fetch(
      "https://simuladorprecos.erse.pt/content/files/OfertasEletricidade.csv",
      { next: { revalidate: 21600 } } as RequestInit
    );
    if (res.ok) {
      const csv = await res.text();
      const parsed = parseCSV(csv);
      if (parsed.length > 0) return parsed;
    }
  } catch { /* fall through to fallback */ }
  return FALLBACK_OFFERS;
}

function parseCSV(csv: string): ERSEOffer[] {
  const lines = csv.split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(";").map(h => h.trim().replace(/"/g, ""));
  const get = (cols: string[], h: string) => {
    const i = headers.indexOf(h);
    return i >= 0 ? cols[i] : "";
  };
  const results: ERSEOffer[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";").map(c => c.trim().replace(/"/g, ""));
    const provider = get(cols, "Comercializador");
    if (!provider) continue;
    const rawType = get(cols, "Tipo de Oferta").toLowerCase();
    const type: "fixed" | "indexed" = rawType.includes("index") ? "indexed" : "fixed";
    // CSV prices are final prices (TAR included) — subtract TAR to get commercial portion
    // This is an approximation; fallback offers are more accurate
    const totalPricePerKwh = parseFloat(get(cols, "Preço Energia (€/kWh)").replace(",", ".")) || 0.165;
    const tar = TAR_2026["6.9"]; // assume 6.9 kVA for CSV parsing
    results.push({
      id: i,
      provider,
      name:                   get(cols, "Nome da Oferta"),
      type,
      green:                  get(cols, "Energia Renovável").toLowerCase() === "sim",
      commercialPricePerKwh:  Math.max(0, totalPricePerKwh - tar.energyPerKwh),
      commercialPowerPerDay:  parseFloat(get(cols, "Termo Fixo (€/mês)").replace(",", ".")) / 30.44 || 0,
      firstYearDiscount:      parseFloat(get(cols, "Desconto 1º Ano (%)").replace(",", ".")) / 100 || 0,
      tags:                   [],
      contactUrl:             get(cols, "URL Contacto") || "https://www.erse.pt",
    });
  }
  return results;
}

// ─── Fallback offers (2026 market data) ──────────────────────────────────────
// Prices are the COMMERCIAL portion only (TAR is added separately by calcMonthly)
// Source: supplier published price lists Jan 2026
export const FALLBACK_OFFERS: ERSEOffer[] = [
  // EDP
  { id:1,  provider:"EDP",        name:"EDP Simples",           type:"fixed",   green:true,  commercialPricePerKwh:0.1127, commercialPowerPerDay:0.2183, firstYearDiscount:0.20, tags:["100% renewable","no lock-in"],       contactUrl:"https://edp.pt" },
  { id:2,  provider:"EDP",        name:"EDP Simples 12M",       type:"fixed",   green:true,  commercialPricePerKwh:0.1052, commercialPowerPerDay:0.2183, firstYearDiscount:0.20, tags:["100% renewable","12M commitment"],   contactUrl:"https://edp.pt" },
  // Endesa
  { id:3,  provider:"Endesa",     name:"Endesa Mia Luz",        type:"fixed",   green:false, commercialPricePerKwh:0.1074, commercialPowerPerDay:0.2263, firstYearDiscount:0,    tags:["fixed 12M"],                        contactUrl:"https://endesa.pt" },
  { id:4,  provider:"Endesa",     name:"Endesa Verde 100%",     type:"fixed",   green:true,  commercialPricePerKwh:0.1099, commercialPowerPerDay:0.2263, firstYearDiscount:0,    tags:["100% renewable"],                   contactUrl:"https://endesa.pt" },
  // Galp
  { id:5,  provider:"Galp",       name:"Galp Essencial",        type:"fixed",   green:false, commercialPricePerKwh:0.1141, commercialPowerPerDay:0.2186, firstYearDiscount:0,    tags:["no lock-in"],                       contactUrl:"https://galp.com/pt" },
  { id:6,  provider:"Galp",       name:"Galp Solar Plus",       type:"fixed",   green:true,  commercialPricePerKwh:0.1128, commercialPowerPerDay:0.2186, firstYearDiscount:0,    tags:["100% renewable"],                   contactUrl:"https://galp.com/pt" },
  // Goldenergy
  { id:7,  provider:"Goldenergy", name:"Goldenergy Casa",       type:"fixed",   green:false, commercialPricePerKwh:0.1038, commercialPowerPerDay:0.2249, firstYearDiscount:0,    tags:["price guarantee"],                  contactUrl:"https://goldenergy.pt" },
  { id:8,  provider:"Goldenergy", name:"Goldenergy Verde",      type:"fixed",   green:true,  commercialPricePerKwh:0.1055, commercialPowerPerDay:0.2249, firstYearDiscount:0,    tags:["100% renewable"],                   contactUrl:"https://goldenergy.pt" },
  // Iberdrola
  { id:9,  provider:"Iberdrola",  name:"Iberdrola Simples",     type:"fixed",   green:false, commercialPricePerKwh:0.1111, commercialPowerPerDay:0.2173, firstYearDiscount:0,    tags:["no lock-in"],                       contactUrl:"https://iberdrola.pt" },
  { id:10, provider:"Iberdrola",  name:"Iberdrola Smart",       type:"indexed", green:false, commercialPricePerKwh:0.0983, commercialPowerPerDay:0.2287, firstYearDiscount:0,    tags:["OMIE indexed","market risk"],       contactUrl:"https://iberdrola.pt" },
  // Repsol
  { id:11, provider:"Repsol",     name:"Repsol Luz Simples",    type:"fixed",   green:false, commercialPricePerKwh:0.1095, commercialPowerPerDay:0.2210, firstYearDiscount:0,    tags:["no lock-in"],                       contactUrl:"https://repsol.pt" },
  { id:12, provider:"Repsol",     name:"Repsol Verde",          type:"fixed",   green:true,  commercialPricePerKwh:0.1105, commercialPowerPerDay:0.2210, firstYearDiscount:0,    tags:["100% renewable"],                   contactUrl:"https://repsol.pt" },
  // Plenitude
  { id:13, provider:"Plenitude",  name:"Plenitude Simples",     type:"fixed",   green:true,  commercialPricePerKwh:0.1029, commercialPowerPerDay:0.2265, firstYearDiscount:0,    tags:["100% renewable","Eni Group"],       contactUrl:"https://plenitude.com/pt" },
  { id:14, provider:"Plenitude",  name:"Plenitude Indexado",    type:"indexed", green:true,  commercialPricePerKwh:0.0941, commercialPowerPerDay:0.2265, firstYearDiscount:0,    tags:["100% renewable","OMIE indexed"],    contactUrl:"https://plenitude.com/pt" },
  // MUON
  { id:15, provider:"MUON",       name:"MUON Simples",          type:"fixed",   green:true,  commercialPricePerKwh:0.1011, commercialPowerPerDay:0.2180, firstYearDiscount:0,    tags:["100% renewable","PT startup"],      contactUrl:"https://muon.energy" },
];
