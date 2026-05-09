import { AgentConfig } from "../agentConfig";

export async function sendWhatsAppAlert(
  config: AgentConfig,
  approvalUrl: string,
  savingsPerMonth: number,
  savingsPerYear: number,
  currentSupplier: string,
  currentMonthlyCost: number,
  bestSupplier: string,
  bestPlan: string,
  bestMonthlyEur: number
): Promise<void> {
  const message = [
    `⚡ *Voltwise — Poupança encontrada!*`,
    ``,
    `De: ${currentSupplier} (€${currentMonthlyCost.toFixed(2)}/mês)`,
    `Para: ${bestSupplier} - ${bestPlan} (€${bestMonthlyEur.toFixed(2)}/mês)`,
    ``,
    `💰 Poupa €${savingsPerMonth.toFixed(2)}/mês (€${savingsPerYear.toFixed(2)}/ano)`,
    ``,
    `Aprova aqui: ${approvalUrl}`,
  ].join("\n");

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`;

  const body = new URLSearchParams({
    From: config.twilioWhatsappFrom,
    To:   config.notifyWhatsappTo,
    Body: message,
  });

  const response = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio WhatsApp send failed: ${response.status} ${error}`);
  }
}