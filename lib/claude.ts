// lib/claude.ts
import Anthropic from "@anthropic-ai/sdk";

export interface InvoiceData {
  supplier: string|null; powerKva: number|null; kwhMonth: number|null;
  billTotal: number|null; tariffType: string|null;
  peakKwh: number|null; offpeakKwh: number|null;
  confidence: string; summary: string;
}

const EXTRACT_PROMPT = `Extract data from this Portuguese electricity invoice and return ONLY valid JSON:
{
  "supplier": "EDP | Endesa | Galp | Goldenergy | Iberdrola | Repsol | or other name",
  "power_kva": number or null (one of: 1.15, 2.3, 3.45, 4.6, 5.75, 6.9, 10.35, 13.8, 17.25, 20.7),
  "kwh_month": number or null,
  "bill_total": number or null (total amount due in euros),
  "tariff_type": "simple" | "bihorario" | "trihorario" | null,
  "peak_kwh": number or null,
  "offpeak_kwh": number or null,
  "confidence": "high" | "medium" | "low",
  "summary": "One sentence in English describing what you found"
}
Use null for any field you cannot determine. Portuguese amounts use comma as decimal separator.`;

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
    max_tokens: 600,
    system: "You are an expert at reading Portuguese electricity invoices. Return only valid JSON.",
    messages: [{ role:"user", content }],
  });

  const raw = (res.content.find(b=>b.type==="text") as Anthropic.TextBlock|undefined)?.text ?? "{}";
  try {
    const p = JSON.parse(raw.replace(/```json|```/g,"").trim());
    return {
      supplier:    p.supplier    ?? null,
      powerKva:    p.power_kva   ? Number(p.power_kva)   : null,
      kwhMonth:    p.kwh_month   ? Number(p.kwh_month)   : null,
      billTotal:   p.bill_total  ? Number(p.bill_total)  : null,
      tariffType:  p.tariff_type ?? null,
      peakKwh:     p.peak_kwh    ? Number(p.peak_kwh)    : null,
      offpeakKwh:  p.offpeak_kwh ? Number(p.offpeak_kwh) : null,
      confidence:  p.confidence  ?? "medium",
      summary:     p.summary     ?? "Invoice read.",
    };
  } catch {
    return { supplier:null,powerKva:null,kwhMonth:null,billTotal:null,tariffType:null,peakKwh:null,offpeakKwh:null,confidence:"low",summary:"Could not read invoice — please enter details manually." };
  }
}

export async function getRecommendation(
  supplier: string, kwhMonth: number, powerKva: number,
  monthlyBill: number, topOffers: Array<{provider:string;name:string;monthlyEstimate:number;annualSaving:number}>,
  apiKey: string
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const top3 = topOffers.slice(0,3).map(o=>`${o.provider} "${o.name}": €${o.monthlyEstimate.toFixed(2)}/month (saves €${o.annualSaving.toFixed(0)}/year)`).join("; ");
  const prompt = `A Portuguese household with ${supplier||"unknown supplier"} pays €${monthlyBill.toFixed(2)}/month for ${kwhMonth} kWh at ${powerKva} kVA (€${(monthlyBill*12).toFixed(0)}/year). Top 3 ERSE offers: ${top3}. Write exactly 2 sentences in English: (1) best saving opportunity with exact figure, (2) practical tip about switching in Portugal (5 business days, new supplier handles everything). Be direct and specific.`;
  try {
    const res = await client.messages.create({
      model:"claude-sonnet-4-5", max_tokens:150,
      messages:[{role:"user",content:prompt}],
    });
    return (res.content.find(b=>b.type==="text") as Anthropic.TextBlock|undefined)?.text ?? "";
  } catch {
    const best = topOffers[0];
    return `Switching to ${best.provider} ${best.name} could save you approximately €${best.annualSaving.toFixed(0)} per year. In Portugal, switching takes just 5 business days — your new supplier handles all the paperwork with no interruption to your electricity supply.`;
  }
}
