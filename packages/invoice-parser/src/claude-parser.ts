// packages/invoice-parser/src/claude-parser.ts
// Uses claude-sonnet-4-6 vision to extract structured data from electricity invoices.
// Handles EDP, Endesa, Galp, Goldenergy, Iberdrola, Repsol and generic layouts.

import Anthropic from "@anthropic-ai/sdk";

export interface InvoiceData {
  supplier: string | null;
  powerKva: number | null;
  kwhMonth: number | null;
  billTotal: number | null;
  tariffType: "simple" | "bihorario" | "trihorario" | null;
  peakKwh: number | null;
  offpeakKwh: number | null;
  billingPeriod: string | null;
  confidence: "high" | "medium" | "low";
  summary: string;
  rawJson: Record<string, unknown>;
}

const SYSTEM_PROMPT = `You are an expert at reading Portuguese household electricity invoices (faturas de eletricidade). 
You extract structured billing data with high precision. 
You understand Portuguese utility terminology: potência contratada, consumo, fora-de-vazio, vazio, termo fixo, tarifa de acesso às redes.
Always return valid JSON only — no markdown, no explanation.`;

const USER_PROMPT = `Extract the following fields from this Portuguese electricity invoice and return ONLY valid JSON:

{
  "supplier": "energy company name (EDP, Endesa, Galp, Goldenergy, Iberdrola, Repsol, or other)",
  "power_kva": number or null (contracted power — must be one of: 1.15, 2.3, 3.45, 4.6, 5.75, 6.9, 10.35, 13.8, 17.25, 20.7),
  "kwh_month": number or null (total monthly consumption in kWh),
  "bill_total": number or null (total amount due in euros — look for 'Total a Pagar' or similar),
  "tariff_type": "simple" | "bihorario" | "trihorario" | null,
  "peak_kwh": number or null (fora-de-vazio / peak consumption if bi/tri-horário),
  "offpeak_kwh": number or null (vazio / off-peak consumption if bi/tri-horário),
  "billing_period": "string describing the billing period e.g. Jan 2026",
  "confidence": "high" | "medium" | "low",
  "summary": "One sentence in English summarising what you found"
}

Use null for any field you cannot determine. Amounts use European decimal notation (comma = decimal point).`;

export async function parseInvoiceFromBase64(
  base64Data: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf",
  apiKey: string
): Promise<InvoiceData> {
  const client = new Anthropic({ apiKey });

  const messageContent: Anthropic.MessageParam["content"] =
    mediaType === "application/pdf"
      ? [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64Data },
          } as Anthropic.DocumentBlockParam,
          { type: "text", text: USER_PROMPT },
        ]
      : [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Data },
          } as Anthropic.ImageBlockParam,
          { type: "text", text: USER_PROMPT },
        ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 700,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: messageContent }],
  });

  const raw = response.content.find((b) => b.type === "text")?.text ?? "{}";
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return {
      supplier: null, powerKva: null, kwhMonth: null, billTotal: null,
      tariffType: null, peakKwh: null, offpeakKwh: null, billingPeriod: null,
      confidence: "low",
      summary: "Could not parse invoice data — please enter details manually.",
      rawJson: {},
    };
  }

  return {
    supplier:      (parsed.supplier as string) || null,
    powerKva:      parsed.power_kva ? Number(parsed.power_kva) : null,
    kwhMonth:      parsed.kwh_month ? Number(parsed.kwh_month) : null,
    billTotal:     parsed.bill_total ? Number(parsed.bill_total) : null,
    tariffType:    (parsed.tariff_type as InvoiceData["tariffType"]) || null,
    peakKwh:       parsed.peak_kwh ? Number(parsed.peak_kwh) : null,
    offpeakKwh:    parsed.offpeak_kwh ? Number(parsed.offpeak_kwh) : null,
    billingPeriod: (parsed.billing_period as string) || null,
    confidence:    (parsed.confidence as InvoiceData["confidence"]) || "medium",
    summary:       (parsed.summary as string) || "Invoice read.",
    rawJson:       parsed,
  };
}

// ── Recommendation generator ────────────────────────────────────────────────

export interface RecommendationInput {
  currentSupplier: string;
  kwhMonth: number;
  powerKva: number;
  currentMonthlyBill: number;
  topOffers: Array<{
    provider: string;
    name: string;
    monthlyEstimate: number;
    annualSaving: number;
  }>;
}

export async function generateRecommendation(
  input: RecommendationInput,
  apiKey: string
): Promise<string> {
  const client = new Anthropic({ apiKey });

  const top3 = input.topOffers
    .slice(0, 3)
    .map(
      (o) =>
        `${o.provider} "${o.name}": €${o.monthlyEstimate.toFixed(2)}/month (saves €${o.annualSaving.toFixed(0)}/year)`
    )
    .join("; ");

  const prompt = `A Portuguese household is currently with ${input.currentSupplier || "their current supplier"}, 
paying €${input.currentMonthlyBill.toFixed(2)}/month for ${input.kwhMonth} kWh/month at ${input.powerKva} kVA (€${(input.currentMonthlyBill * 12).toFixed(0)}/year).

Top 3 cheaper ERSE market offers: ${top3}.

Write exactly 2 sentences in English:
1. The best switching opportunity with specific savings figure.
2. One practical tip about the switching process in Portugal (takes 5 business days, no interruption, new supplier handles everything).

Be direct and specific. No fluff.`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });
    return response.content.find((b) => b.type === "text")?.text ?? "";
  } catch {
    const best = input.topOffers[0];
    return `Switching to ${best.provider} ${best.name} could save you approximately €${best.annualSaving.toFixed(0)} per year. In Portugal, switching suppliers takes just 5 business days — your new supplier handles all the paperwork with no interruption to your electricity supply.`;
  }
}
