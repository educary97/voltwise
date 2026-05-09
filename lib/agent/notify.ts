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
  const summary = [
    `⚡ *Voltwise — Poupança encontrada!*`,
    `De: ${currentSupplier} (€${currentMonthlyCost.toFixed(2)}/mês)`,
    `Para: ${bestSupplier} (€${bestMonthlyEur.toFixed(2)}/mês)`,
    `💰 Poupa €${savingsPerMonth.toFixed(2)}/mês`,
    `A enviar link de aprovação...`,
  ].join("\n");

  const auth = "Basic " + Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64");
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`;

  // Send summary message
  await fetch(twilioUrl, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ From: config.twilioWhatsappFrom, To: config.notifyWhatsappTo, Body: summary }).toString(),
  });

  // Send approval URL in separate message
  await fetch(twilioUrl, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ From: config.twilioWhatsappFrom, To: config.notifyWhatsappTo, Body: approvalUrl }).toString(),
  });
}