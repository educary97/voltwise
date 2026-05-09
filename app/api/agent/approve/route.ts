import { NextRequest, NextResponse } from "next/server";
import { getAgentConfig } from "@/lib/agentConfig";
import { verifyAndDecodeApprovalUrl } from "@/lib/agent/approvalToken";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const config = getAgentConfig();
    const { data, sig } = await req.json();

    if (!data || !sig) {
      return NextResponse.json({ error: "Missing data or sig" }, { status: 400 });
    }

    let payload;
    try {
      payload = verifyAndDecodeApprovalUrl(data, sig, config.agentApproveSecret);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const { email } = payload;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:     `Voltwise <${config.notifyToEmail}>`,
        to:       [email.to],
        reply_to: config.userEmail,
        subject:  email.subject,
        text:     email.body,
      }),
    });

    if (!resendRes.ok) {
      const error = await resendRes.text();
      throw new Error(`Resend failed: ${resendRes.status} ${error}`);
    }

    const resendData = await resendRes.json();
    return NextResponse.json({ success: true, emailId: resendData.id, sentTo: email.to });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to send email" }, { status: 500 });
  }
}