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
    `⚡ *Voltwise — Oportunidade de Poupança*`,
    ``,
    `Encontrei uma oferta melhor para a tua electricidade:`,
    ``,
    `📋 *Plano atual*`,
    `Fornecedor: ${currentSupplier}`,
    `Custo mensal: €${currentMonthlyCost.toFixed(2)}`,
    ``,
    `✨ *Melhor oferta*`,
    `Fornecedor: ${bestSupplier}`,
    `Plano: ${bestPlan}`,
    `Custo estimado: €${bestMonthlyEur.toFixed(2)}/mês`,
    ``,
    `💰 *Poupança potencial*`,
    `Por mês: €${savingsPerMonth.toFixed(2)}`,
    `Por ano: €${savingsPerYear.toFixed(2)}`,
    ``,
    `🔍 Revê o rascunho do email e aprova a mudança:`,
    approvalUrl,
    ``,
    `_(O link é válido durante 7 dias)_`,
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