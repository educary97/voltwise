// lib/claude.ts
import Anthropic from "@anthropic-ai/sdk";

export interface InvoiceData {
  supplier:      string|null;
  powerKva:      number|null;
  kwhMonth:      number|null;
  billTotal:     number|null;
  tariffType:    string|null;
  peakKwh:       number|null;
  offpeakKwh:    number|null;
  // Price components
  pricePerKwh:   number|null;  // commercial energy price €/kWh
  fixedMonthly:  number|null;  // fixed/power charge per month €
  confidence:    string;
  summary:       string;
}

const EXTRACT_PROMPT = `Extract data from this Portuguese electricity invoice and return ONLY valid JSON.

Portuguese electricity bills have this structure:
- Comercialização (commercial charges): energy price per kWh + fixed daily power charge
- Tarifas de Acesso (network access): regulated grid charges — same for all suppliers
- Taxas e Impostos: DGEG, Audiovisual, ISPE taxes
- IVA: VAT at 6% (energy) and 23% (fixed/power charges)

Extract:
{
  "supplier": "EDP | Endesa | Galp | Goldenergy | Iberdrola | Repsol | Plenitude | MUON | or exact name",
  "power_kva": number or null (one of: 1.15, 2.3, 3.45, 4.6, 5.75, 6.9, 10.35, 13.8, 17.25, 20.7),
  "kwh_month": number or null (total kWh consumed this month),
  "bill_total": number or null (final total amount due in euros including all taxes),
  "tariff_type": "simple" | "bihorario" | "trihorario" | null,
  "peak_kwh": number or null (peak/ponta kWh if bi or tri-hourly),
  "offpeak_kwh": number or null (off-peak/vazio kWh if bi or tri-hourly),
  "price_per_kwh": number or null (the commercial energy price per kWh from Comercialização section — NOT the network access price. Look for lines like "Energia Simples" under Comercialização),
  "fixed_monthly": number or null (the total fixed/power charge per month from Comercialização — look for "Potência Contratada" under Comercialização, multiply daily rate by days in period),
  "confidence": "high" | "medium" | "low",
  "summary": "One sentence in English: supplier, kWh, bill total, and price per kWh if found"
}

Important notes:
- Portuguese amounts use comma as decimal separator (e.g. 0,1127 = 0.1127)
- price_per_kwh should be the COMMERCIAL portion only (Comercialização section), not the total including grid access
- If you can only find the total price per kWh (including grid access), still return it — it's better than null
- fixed_monthly is the commercialisation power charge only (Comercialização > Potência Contratada × days)
- Use null for any field you cannot determine with reasonable confidence`;

export async function extractInvoice(
  base64: string,
  mediaType: string,
  apiKey: string
): Promise<InvoiceData> {
  const client = new Anthropic({ apiKey });

  const content: Anthropic.MessageParam["content"] =
    mediaType === "application/pdf"
      ? [
          { type:"document", source:{ type:"base64", media_type:"application/pdf", data:base64 } } as Anthropic.DocumentBlockParam,
          { type:"text", text:EXTRACT_PROMPT },
        ]
      : [
          { type:"image", source:{ type:"base64", media_type:mediaType as "image/jpeg"|"image/png"|"image/webp", data:base64 } } as Anthropic.ImageBlockParam,
          { type:"text", text:EXTRACT_PROMPT },
        ];

  const res = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 700,
    system: "You are an expert at reading Portuguese electricity invoices. Return only valid JSON, no markdown.",
    messages: [{ role:"user", content }],
  });

  const raw = (res.content.find(b=>b.type==="text") as Anthropic.TextBlock|undefined)?.text ?? "{}";
  try {
    const p = JSON.parse(raw.replace(/```json|```/g,"").trim());
    return {
      supplier:     p.supplier     ?? null,
      powerKva:     p.power_kva    ? Number(p.power_kva)    : null,
      kwhMonth:     p.kwh_month    ? Number(p.kwh_month)    : null,
      billTotal:    p.bill_total   ? Number(p.bill_total)   : null,
      tariffType:   p.tariff_type  ?? null,
      peakKwh:      p.peak_kwh     ? Number(p.peak_kwh)     : null,
      offpeakKwh:   p.offpeak_kwh  ? Number(p.offpeak_kwh)  : null,
      pricePerKwh:  p.price_per_kwh? Number(p.price_per_kwh): null,
      fixedMonthly: p.fixed_monthly? Number(p.fixed_monthly): null,
      confidence:   p.confidence   ?? "medium",
      summary:      p.summary      ?? "Invoice read.",
    };
  } catch {
    return {
      supplier:null, powerKva:null, kwhMonth:null, billTotal:null,
      tariffType:null, peakKwh:null, offpeakKwh:null,
      pricePerKwh:null, fixedMonthly:null,
      confidence:"low",
      summary:"Could not read invoice — please enter details manually.",
    };
  }
}

export async function getRecommendation(
  supplier: string, kwhMonth: number, powerKva: number,
  monthlyBill: number,
  topOffers: Array<{provider:string;name:string;monthlyEstimate:number;annualSaving:number}>,
  apiKey: string
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const top3 = topOffers.slice(0,3).map(o=>`${o.provider} "${o.name}": €${o.monthlyEstimate.toFixed(2)}/month (saves €${o.annualSaving.toFixed(0)}/year)`).join("; ");
  const prompt = `A Portuguese household pays €${monthlyBill.toFixed(2)}/month for ${kwhMonth.toFixed(0)} kWh at ${powerKva} kVA with ${supplier||"current supplier"} (€${(monthlyBill*12).toFixed(0)}/year). Top 3 ERSE offers: ${top3}. Write exactly 2 sentences in English: (1) best saving opportunity with exact figure, (2) one practical tip about switching in Portugal (5 business days, new supplier handles everything, no supply interruption). Be direct and specific.`;
  try {
    const res = await client.messages.create({
      model:"claude-sonnet-4-5", max_tokens:160,
      messages:[{role:"user",content:prompt}],
    });
    return (res.content.find(b=>b.type==="text") as Anthropic.TextBlock|undefined)?.text ?? "";
  } catch {
    const best = topOffers[0];
    return `Switching to ${best.provider} ${best.name} could save you approximately €${best.annualSaving.toFixed(0)} per year. In Portugal, switching takes just 5 business days — your new supplier handles all the paperwork with no interruption to your electricity supply.`;
  }
}
