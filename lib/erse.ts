// lib/erse.ts — ERSE tariff calculator + offer database

export const GRID_ACCESS: Record<string, number> = {
  "1.15":8.18,"2.3":12.20,"3.45":16.22,"4.6":18.24,"5.75":20.14,
  "6.9":22.98,"10.35":30.12,"13.8":37.26,"17.25":44.40,"20.7":51.54,
};

export interface ERSEOffer {
  id: number; provider: string; name: string;
  type: "fixed"|"indexed"; green: boolean;
  pricePerKwh: number; fixedMonthly: number; firstYearDiscount: number;
  tags: string[]; contactUrl: string;
}

export interface CalculatedOffer extends ERSEOffer {
  monthlyEstimate: number; annualEstimate: number;
  annualSaving: number; savingPercent: number;
}

export interface UserInput {
  powerKva: number; kwhMonth: number;
  tariffType: string; currentBill: number;
}

export function calcMonthly(o: ERSEOffer, input: UserInput): number {
  const grid = GRID_ACCESS[String(input.powerKva)] ?? GRID_ACCESS["6.9"];
  let sub = grid + input.kwhMonth * o.pricePerKwh + o.fixedMonthly;
  if (o.firstYearDiscount > 0) {
    sub = grid + (input.kwhMonth * o.pricePerKwh + o.fixedMonthly) * (1 - o.firstYearDiscount);
  }
  return sub * 1.06;
}

export function rankOffers(offers: ERSEOffer[], input: UserInput): CalculatedOffer[] {
  const annual = input.currentBill * 12;
  return offers.map(o => {
    const monthlyEstimate = calcMonthly(o, input);
    const annualEstimate  = monthlyEstimate * 12;
    const annualSaving    = annual - annualEstimate;
    return { ...o, monthlyEstimate, annualEstimate, annualSaving, savingPercent: annualSaving / annual * 100 };
  }).sort((a, b) => a.monthlyEstimate - b.monthlyEstimate);
}

export async function fetchOffers(): Promise<ERSEOffer[]> {
  // Try ERSE CSV first, fall back to curated dataset
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
  } catch { /* fall through */ }
  return FALLBACK_OFFERS;
}

function parseCSV(csv: string): ERSEOffer[] {
  const lines = csv.split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(";").map(h => h.trim().replace(/"/g,""));
  const get = (cols: string[], h: string) => { const i = headers.indexOf(h); return i>=0?cols[i]:""; };
  return lines.slice(1).map((line, i) => {
    const cols = line.split(";").map(c => c.trim().replace(/"/g,""));
    return {
      id: i+1,
      provider:          get(cols,"Comercializador"),
      name:              get(cols,"Nome da Oferta"),
      type:              get(cols,"Tipo de Oferta").toLowerCase().includes("index")?"indexed":"fixed" as "fixed"|"indexed",
      green:             get(cols,"Energia Renovável").toLowerCase()==="sim",
      pricePerKwh:       parseFloat(get(cols,"Preço Energia (€/kWh)").replace(",","."))||0.165,
      fixedMonthly:      parseFloat(get(cols,"Termo Fixo (€/mês)").replace(",","."))||0,
      firstYearDiscount: parseFloat(get(cols,"Desconto 1º Ano (%)").replace(",","."))/100||0,
      tags:              [],
      contactUrl:        get(cols,"URL Contacto")||"https://www.erse.pt",
    };
  }).filter(o => o.provider);
}

export const FALLBACK_OFFERS: ERSEOffer[] = [
  {id:1, provider:"EDP",        name:"EDP Simples",           type:"fixed",   green:true,  pricePerKwh:0.1687,fixedMonthly:0,   firstYearDiscount:0.20,tags:["100% renewable","no lock-in"],      contactUrl:"https://edp.pt"},
  {id:2, provider:"EDP",        name:"EDP Simples 12M",       type:"fixed",   green:true,  pricePerKwh:0.1612,fixedMonthly:0,   firstYearDiscount:0.20,tags:["100% renewable","12M commitment"],  contactUrl:"https://edp.pt"},
  {id:3, provider:"Endesa",     name:"Endesa Mia Luz",        type:"fixed",   green:false, pricePerKwh:0.1634,fixedMonthly:2.50,firstYearDiscount:0,   tags:["fixed 12M"],                       contactUrl:"https://endesa.pt"},
  {id:4, provider:"Endesa",     name:"Endesa Verde 100%",     type:"fixed",   green:true,  pricePerKwh:0.1659,fixedMonthly:2.50,firstYearDiscount:0,   tags:["100% renewable"],                  contactUrl:"https://endesa.pt"},
  {id:5, provider:"Galp",       name:"Galp Essencial",        type:"fixed",   green:false, pricePerKwh:0.1701,fixedMonthly:0,   firstYearDiscount:0,   tags:["no lock-in"],                      contactUrl:"https://galp.com/pt"},
  {id:6, provider:"Galp",       name:"Galp Solar Plus",       type:"fixed",   green:true,  pricePerKwh:0.1688,fixedMonthly:0,   firstYearDiscount:0,   tags:["100% renewable"],                  contactUrl:"https://galp.com/pt"},
  {id:7, provider:"Goldenergy", name:"Goldenergy Casa",       type:"fixed",   green:false, pricePerKwh:0.1598,fixedMonthly:1.90,firstYearDiscount:0,   tags:["price guarantee"],                 contactUrl:"https://goldenergy.pt"},
  {id:8, provider:"Goldenergy", name:"Goldenergy Verde",      type:"fixed",   green:true,  pricePerKwh:0.1615,fixedMonthly:1.90,firstYearDiscount:0,   tags:["100% renewable"],                  contactUrl:"https://goldenergy.pt"},
  {id:9, provider:"Iberdrola",  name:"Iberdrola Simples",     type:"fixed",   green:false, pricePerKwh:0.1671,fixedMonthly:0,   firstYearDiscount:0,   tags:["no lock-in"],                      contactUrl:"https://iberdrola.pt"},
  {id:10,provider:"Iberdrola",  name:"Iberdrola Smart",       type:"indexed", green:false, pricePerKwh:0.1543,fixedMonthly:3.50,firstYearDiscount:0,   tags:["OMIE indexed","market risk"],      contactUrl:"https://iberdrola.pt"},
  {id:11,provider:"Repsol",     name:"Repsol Luz Simples",    type:"fixed",   green:false, pricePerKwh:0.1655,fixedMonthly:1.20,firstYearDiscount:0,   tags:["no lock-in"],                      contactUrl:"https://repsol.pt"},
  {id:12,provider:"Repsol",     name:"Repsol Verde",          type:"fixed",   green:true,  pricePerKwh:0.1665,fixedMonthly:1.20,firstYearDiscount:0,   tags:["100% renewable"],                  contactUrl:"https://repsol.pt"},
  {id:13,provider:"Plenitude",  name:"Plenitude Simples",     type:"fixed",   green:true,  pricePerKwh:0.1589,fixedMonthly:2.00,firstYearDiscount:0,   tags:["100% renewable","Eni Group"],      contactUrl:"https://plenitude.com/pt"},
  {id:14,provider:"Plenitude",  name:"Plenitude Indexado",    type:"indexed", green:true,  pricePerKwh:0.1501,fixedMonthly:2.00,firstYearDiscount:0,   tags:["100% renewable","OMIE indexed"],   contactUrl:"https://plenitude.com/pt"},
  {id:15,provider:"MUON",       name:"MUON Simples",          type:"fixed",   green:true,  pricePerKwh:0.1571,fixedMonthly:0.90,firstYearDiscount:0,   tags:["100% renewable","PT startup"],     contactUrl:"https://muon.energy"},
];
