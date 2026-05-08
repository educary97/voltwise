// apps/web/lib/notify.ts
// Sends admin email notifications via Resend (resend.com — free tier: 3,000 emails/month)
// Falls back to console.error if RESEND_API_KEY is not configured.

const ADMIN_EMAIL   = "eduardolcary@gmail.com";
const FROM_EMAIL    = "Voltwise Alerts <alerts@voltwise.app>";
const RESEND_API    = "https://api.resend.com/emails";

export type NotifyEvent =
  | { type: "api_credits_exhausted"; error: string; endpoint: string }
  | { type: "api_error"; error: string; endpoint: string; statusCode?: number }
  | { type: "usage_milestone"; comparisons: number };

export async function notifyAdmin(event: NotifyEvent): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Resend not configured — log to console so it shows in Vercel logs
    console.error("[ADMIN ALERT]", JSON.stringify(event));
    return;
  }

  const { subject, html } = buildEmail(event);

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [ADMIN_EMAIL],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[notify] Resend error:", res.status, body);
    }
  } catch (err) {
    // Never let notification failure crash the app
    console.error("[notify] Failed to send admin email:", err);
  }
}

function buildEmail(event: NotifyEvent): { subject: string; html: string } {
  const now = new Date().toLocaleString("en-GB", { timeZone: "Europe/Lisbon" });

  switch (event.type) {
    case "api_credits_exhausted":
      return {
        subject: "⚠️ Voltwise — Anthropic API credits exhausted",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <h2 style="color:#dc2626;margin-bottom:8px">⚠️ API Credits Exhausted</h2>
            <p style="color:#374151;margin-bottom:16px">
              A user tried to use Voltwise but the Anthropic API ran out of credit.
              <strong>New comparisons are currently failing.</strong>
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
              <tr style="border-bottom:1px solid #e5e7eb">
                <td style="padding:8px 0;color:#6b7280;width:40%">Time</td>
                <td style="padding:8px 0;color:#111827">${now} (Lisbon)</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e7eb">
                <td style="padding:8px 0;color:#6b7280">Endpoint</td>
                <td style="padding:8px 0;color:#111827;font-family:monospace">${event.endpoint}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280">Error</td>
                <td style="padding:8px 0;color:#dc2626;font-family:monospace;font-size:12px">${event.error}</td>
              </tr>
            </table>
            <a href="https://console.anthropic.com/settings/billing"
               style="display:inline-block;background:#111827;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500">
              Top up credit →
            </a>
            <p style="font-size:12px;color:#9ca3af;margin-top:24px">
              Voltwise admin alert · <a href="https://console.anthropic.com" style="color:#6b7280">Anthropic Console</a>
            </p>
          </div>`,
      };

    case "api_error":
      return {
        subject: `⚠️ Voltwise — API error on ${event.endpoint}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <h2 style="color:#b45309;margin-bottom:8px">⚠️ API Error</h2>
            <p style="color:#374151;margin-bottom:16px">
              An Anthropic API call failed on Voltwise.
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
              <tr style="border-bottom:1px solid #e5e7eb">
                <td style="padding:8px 0;color:#6b7280;width:40%">Time</td>
                <td style="padding:8px 0;color:#111827">${now} (Lisbon)</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e7eb">
                <td style="padding:8px 0;color:#6b7280">Endpoint</td>
                <td style="padding:8px 0;color:#111827;font-family:monospace">${event.endpoint}</td>
              </tr>
              <tr style="border-bottom:1px solid #e5e7eb">
                <td style="padding:8px 0;color:#6b7280">Status</td>
                <td style="padding:8px 0;color:#111827">${event.statusCode ?? "unknown"}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280">Error</td>
                <td style="padding:8px 0;color:#b45309;font-family:monospace;font-size:12px">${event.error}</td>
              </tr>
            </table>
            <a href="https://console.anthropic.com"
               style="display:inline-block;background:#111827;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500">
              Check Anthropic Console →
            </a>
          </div>`,
      };

    case "usage_milestone":
      return {
        subject: `🎉 Voltwise — ${event.comparisons} comparisons completed`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <h2 style="color:#1a6b3c;margin-bottom:8px">🎉 Usage Milestone</h2>
            <p style="color:#374151">
              Voltwise has now completed <strong>${event.comparisons} electricity comparisons</strong>.
            </p>
            <p style="color:#6b7280;font-size:14px;margin-top:12px">
              Estimated API cost so far: ~€${(event.comparisons * 0.02).toFixed(2)}<br>
              Time: ${now} (Lisbon)
            </p>
          </div>`,
      };
  }
}
