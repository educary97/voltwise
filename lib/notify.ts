// lib/notify.ts
const ADMIN_EMAIL = "eduardolcary@gmail.com";
const FROM_EMAIL  = "Voltwise Alerts <alerts@voltwise.app>";

export type NotifyEvent =
  | { type: "api_credits_exhausted"; error: string; endpoint: string }
  | { type: "api_error"; error: string; endpoint: string; statusCode?: number }
  | { type: "usage_milestone"; comparisons: number };

export async function notifyAdmin(event: NotifyEvent): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[ADMIN ALERT]", JSON.stringify(event));
    return;
  }
  const { subject, html } = buildEmail(event);
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [ADMIN_EMAIL], subject, html }),
    });
  } catch (err) {
    console.error("[notify] Failed:", err);
  }
}

function buildEmail(event: NotifyEvent) {
  const now = new Date().toLocaleString("en-GB", { timeZone: "Europe/Lisbon" });
  switch (event.type) {
    case "api_credits_exhausted":
      return {
        subject: "⚠️ Voltwise — Anthropic API credits exhausted",
        html: `<div style="font-family:Arial,sans-serif;padding:24px;max-width:520px">
          <h2 style="color:#dc2626">⚠️ API Credits Exhausted</h2>
          <p>Users cannot use Voltwise right now. <strong>Please top up your Anthropic credit.</strong></p>
          <p style="color:#6b7280;font-size:14px">Time: ${now} · Endpoint: ${event.endpoint}</p>
          <p style="color:#dc2626;font-family:monospace;font-size:12px">${event.error}</p>
          <a href="https://console.anthropic.com/settings/billing"
             style="display:inline-block;background:#111827;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:500;margin-top:12px">
            Top up credit →
          </a></div>`,
      };
    case "api_error":
      return {
        subject: `⚠️ Voltwise — API error on ${event.endpoint}`,
        html: `<div style="font-family:Arial,sans-serif;padding:24px;max-width:520px">
          <h2 style="color:#b45309">⚠️ API Error</h2>
          <p style="color:#6b7280;font-size:14px">Time: ${now} · Endpoint: ${event.endpoint} · Status: ${event.statusCode ?? "unknown"}</p>
          <p style="color:#b45309;font-family:monospace;font-size:12px">${event.error}</p>
          <a href="https://console.anthropic.com" style="display:inline-block;background:#111827;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:500;margin-top:12px">
            Check Console →
          </a></div>`,
      };
    case "usage_milestone":
      return {
        subject: `🎉 Voltwise — ${event.comparisons} comparisons done`,
        html: `<div style="font-family:Arial,sans-serif;padding:24px;max-width:520px">
          <h2 style="color:#1a6b3c">🎉 ${event.comparisons} comparisons completed</h2>
          <p style="color:#6b7280;font-size:14px">Estimated API cost so far: ~€${(event.comparisons * 0.02).toFixed(2)} · ${now}</p>
          </div>`,
      };
  }
}
