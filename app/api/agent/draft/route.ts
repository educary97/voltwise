import { NextRequest, NextResponse } from "next/server";
import { getAgentConfig } from "@/lib/agentConfig";
import { verifyAndDecodeApprovalUrl } from "@/lib/agent/approvalToken";
import { draftSwitchEmail } from "@/lib/agent/draftSwitchEmail";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    const { comparison } = payload;

    const bestOffer = {
      supplier:            comparison.bestSupplier,
      plan:                comparison.bestPlan,
      estimatedMonthlyEur: comparison.estimatedMonthlyEur,
      tariffType:          "fixed" as const,
      supplierEmail:       comparison.supplierEmail,
    };

    const draft = await draftSwitchEmail(config, bestOffer);

    return NextResponse.json({ draft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to generate draft" }, { status: 500 });
  }
}