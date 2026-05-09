// src/app/api/agent/run/route.ts
// Main orchestrator — triggered by Vercel Cron or manual POST
// Protected by CRON_SECRET header (set automatically by Vercel for cron jobs)

import { NextRequest, NextResponse } from "next/server";
import { getAgentConfig } from "@/lib/agentConfig";
import { compareToCurrentPlan } from "@/lib/agent/compareToCurrentPlan";
import { draftSwitchEmail } from "@/lib/agent/draftSwitchEmail";
import { buildApprovalUrl, ApprovalPayload } from "@/lib/agent/approvalToken";
import { sendWhatsAppAlert } from "@/lib/agent/notify";

export async function POST(req: NextRequest) {
  // Protect the endpoint — Vercel sets this automatically for cron jobs
  // For manual triggers, pass the same secret as Authorization: Bearer <secret>
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const config = getAgentConfig();

    console.log("[agent/run] Starting monthly comparison run...");

    // Step 1: Compare current plan against market
    const comparison = await compareToCurrentPlan(config, config.appBaseUrl);

    console.log(
      `[agent/run] Best offer: ${comparison.bestOffer.supplier} @ €${comparison.bestOffer.estimatedMonthlyEur}/month. Savings: €${comparison.savingsPerMonth.toFixed(2)}/month`
    );

    if (!comparison.shouldSwitch) {
      console.log(
        `[agent/run] Savings €${comparison.savingsPerMonth.toFixed(2)} below threshold €${config.switchingThresholdEur}. No action.`
      );
      return NextResponse.json({
        action: "no_switch",
        reason: "Savings below threshold",
        savingsPerMonth: comparison.savingsPerMonth,
        threshold: config.switchingThresholdEur,
        bestOffer: comparison.bestOffer,
      });
    }

    // Step 2: Draft the switching email using Claude
    console.log(`[agent/run] Drafting switch email to ${comparison.bestOffer.supplier}...`);
    const draft = await draftSwitchEmail(config, comparison.bestOffer);

    // Step 3: Build the approval payload + URL
    const payload: ApprovalPayload = {
      email: draft,
      comparison: {
        currentMonthlyCost: comparison.currentMonthlyCost,
        bestSupplier: comparison.bestOffer.supplier,
        bestPlan: comparison.bestOffer.plan,
        estimatedMonthlyEur: comparison.bestOffer.estimatedMonthlyEur,
        savingsPerMonth: comparison.savingsPerMonth,
        savingsPerYear: comparison.savingsPerYear,
      },
      createdAt: new Date().toISOString(),
    };

    const approvalUrl = buildApprovalUrl(payload, config.agentApproveSecret, config.appBaseUrl);

    // Step 4: Send WhatsApp alert
    console.log(`[agent/run] Sending WhatsApp alert...`);
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

    console.log(`[agent/run] Done. Alert sent.`);

    return NextResponse.json({
      action: "alert_sent",
      bestOffer: comparison.bestOffer,
      savingsPerMonth: comparison.savingsPerMonth,
      savingsPerYear: comparison.savingsPerYear,
      draftTo: draft.to,
      draftSubject: draft.subject,
    });
  } catch (err: any) {
    console.error("[agent/run] Error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support GET for Vercel Cron (cron jobs call GET by default)
export async function GET(req: NextRequest) {
  return POST(req);
}
