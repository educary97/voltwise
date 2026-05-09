import Anthropic from "@anthropic-ai/sdk";
import { AgentConfig } from "../agentConfig";
import { SupplierOffer } from "./compareToCurrentPlan";

export interface DraftedEmail {
  to: string;
  subject: string;
  body: string;
}

export async function draftSwitchEmail(
  config: AgentConfig,
  bestOffer: SupplierOffer
): Promise<DraftedEmail> {
  const client = new Anthropic();

  const prompt = `You are helping a Portuguese electricity customer switch supplier.
Draft a professional switching request email in Portuguese (European Portuguese) to the new supplier.

The customer wants to join this supplier:
- Supplier: ${bestOffer.supplier}
- Plan: ${bestOffer.plan}

Customer details to include:
- Name: ${config.userName}
- NIF: ${config.userNif}
- IBAN: ${config.userIban}
- CPE (meter number): ${config.userCpe}
- Address: ${config.userAddress}
- Phone: ${config.userPhone}
- Email: ${config.userEmail}
- Current supplier: ${config.currentSupplier}
- Current plan: ${config.currentPlan}

The email should:
1. State clearly the customer wants to switch to ${bestOffer.supplier} on the ${bestOffer.plan} plan
2. Include all the required switching details (NIF, IBAN, CPE, current supplier name)
3. Request that the supplier handles the termination of the existing contract
4. Be polite and professional
5. Be in European Portuguese

Respond ONLY with a JSON object in this exact format (no markdown, no preamble):
{
  "subject": "...",
  "body": "..."
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as any).text)
    .join("");

  let parsed: { subject: string; body: string };
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Claude did not return valid JSON for the email draft");
    parsed = JSON.parse(match[0]);
  }

  const supplierEmail =
    bestOffer.supplierEmail ??
    `clientes@${bestOffer.supplier.toLowerCase().replace(/\s/g, "")}.pt`;

  return {
    to: supplierEmail,
    subject: parsed.subject,
    body: parsed.body,
  };
}