import { NextRequest, NextResponse } from "next/server";
import { getAgentConfig } from "@/lib/agentConfig";
import { compareToCurrentPlan } from "@/lib/agent/compareToCurrentPlan";
import { draftSwitchEmail } from "@/lib/agent/draftSwitchEmail";
import { buildApprovalUrl, ApprovalPayload } from "@/lib/agent/approvalToken";
import { sendWhatsAppAlert } from "@/lib/agent/notify";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = getAgentConfig();
    const comparison = await compareToCurrentPlan(config, config.appBaseUrl);

    if (!comparison.shouldSwitch) {
      return NextResponse.json({
        action: "no_switch",
        reason: "Savings below threshold",
        savingsPerMonth: comparison.savingsPerMonth,
        threshold: config.switchingThresholdEur,
        bestOffer: comparison.bestOffer,
      });
    }

    const draft = await draftSwitchEmail(config, comparison.bestOffer);

    const payload: ApprovalPayload = {
      email: draft,
      comparison: {
        currentMonthlyCost:  comparison.currentMonthlyCost,
        bestSupplier:        comparison.bestOffer.supplier,
        bestPlan:            comparison.bestOffer.plan,
        estimatedMonthlyEur: comparison.bestOffer.estimatedMonthlyEur,
        savingsPerMonth:     comparison.savingsPerMonth,
        savingsPerYear:      comparison.savingsPerYear,
      },
      createdAt: new Date().toISOString(),
    };

    const approvalUrl = buildApprovalUrl(payload, config.agentApproveSecret, config.appBaseUrl);

    await sendWhatsAppAlert(
      config,
      approvalUrl,
      comparison.savingsPerMonth,
      comparison.savingsPerYear,
      config.currentSupplier,
      comparison.currentMonthlyCost,
      comparison.bestOffer.supplier,
      comparison.bestOffer.plan,
      comparison.bestOffer.estimatedMonthlyEur
    );

    return NextResponse.json({
      action: "alert_sent",
      bestOffer: comparison.bestOffer,
      savingsPerMonth: comparison.savingsPerMonth,
      savingsPerYear: comparison.savingsPerYear,
      draftTo: draft.to,
      draftSubject: draft.subject,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}