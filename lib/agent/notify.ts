import { AgentConfig } from "../agentConfig";

async function sendWhatsApp(
  config: AgentConfig,
  messages: string[]
): Promise<void> {
  const auth = "Basic " + Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64");
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`;

  for (const msg of messages) {
    await fetch(twilioUrl, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ From: config.twilioWhatsappFrom, To: config.notifyWhatsappTo, Body: msg }).toString(),
    });
  }
}

async function sendEmail(
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
  const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#FAFAF7;padding:32px 24px;border-radius:16px;">
      <div style="font-size:22px;font-weight:700;margin-bottom:4px;">Voltwise<span style="color:#6abf69">.</span></div>
      <div style="font-size:12px;color:#aaa;margin-bottom:32px;">Monthly switching agent</div>

      <div style="background:#1a1a1a;border-radius:16px;padding:24px;margin-bottom:20px;">
        <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Potential annual saving</div>
        <div style="font-family:Georgia,serif;font-size:48px;font-weight:700;color:#6abf69;line-height:1;margin-bottom:8px;">€${savingsPerYear.toFixed(0)}</div>
        <div style="font-size:14px;color:#555;">by switching to <strong style="color:#6abf69">${bestSupplier}</strong></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;">
          <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:12px;">
            <div style="font-size:11px;color:#555;margin-bottom:4px;">You pay now</div>
            <div style="font-size:16px;font-weight:600;color:white;">€${currentMonthlyCost.toFixed(2)}/mo</div>
            <div style="font-size:11px;color:#444;margin-top:2px;">${currentSupplier}</div>
          </div>
          <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:12px;">
            <div style="font-size:11px;color:#555;margin-bottom:4px;">Best offer</div>
            <div style="font-size:16px;font-weight:600;color:white;">€${bestMonthlyEur.toFixed(2)}/mo</div>
            <div style="font-size:11px;color:#444;margin-top:2px;">${bestSupplier} · ${bestPlan}</div>
          </div>
        </div>
      </div>

      <div style="background:white;border:1px solid #e8e6df;border-radius:12px;padding:16px 20px;margin-bottom:20px;font-size:14px;color:#555;line-height:1.6;">
        💰 <strong>€${savingsPerMonth.toFixed(2)}/month</strong> in savings — that's <strong>€${savingsPerYear.toFixed(2)}/year</strong> back in your pocket.
      </div>

      <a href="${approvalUrl}" style="display:block;text-align:center;background:#1a1a1a;color:white;text-decoration:none;padding:16px 24px;border-radius:12px;font-size:15px;font-weight:600;margin-bottom:12px;">
        Review draft email & approve switch →
      </a>

      <div style="font-size:11px;color:#bbb;text-align:center;line-height:1.6;">
        This link is valid for 7 days. Clicking it takes you to a review page — nothing is sent until you confirm.<br/>
        Voltwise agent · running monthly on your behalf
      </div>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:    `Voltwise Agent <${config.notifyToEmail}>`,
      to:      [config.notifyToEmail],
      subject: `⚡ Save €${savingsPerYear.toFixed(0)}/year — switch to ${bestSupplier}`,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend notification failed: ${res.status} ${error}`);
  }
}

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

  // Send both WhatsApp and email in parallel
  await Promise.allSettled([
    sendWhatsApp(config, [summary, approvalUrl]),
    sendEmail(config, approvalUrl, savingsPerMonth, savingsPerYear, currentSupplier, currentMonthlyCost, bestSupplier, bestPlan, bestMonthlyEur),
  ]);
}