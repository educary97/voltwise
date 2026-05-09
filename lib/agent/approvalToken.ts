import crypto from "crypto";
import { DraftedEmail } from "./draftSwitchEmail";

export interface ApprovalPayload {
  email: DraftedEmail;
  comparison: {
    currentMonthlyCost: number;
    bestSupplier: string;
    bestPlan: string;
    estimatedMonthlyEur: number;
    savingsPerMonth: number;
    savingsPerYear: number;
  };
  createdAt: string;
}

export function buildApprovalUrl(
  payload: ApprovalPayload,
  secret: string,
  appBaseUrl: string
): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${appBaseUrl}/approve?data=${data}&sig=${sig}`;
}

export function verifyAndDecodeApprovalUrl(
  data: string,
  sig: string,
  secret: string
): ApprovalPayload {
  const expectedSig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  if (expectedSig !== sig) throw new Error("Invalid approval token signature");

  const payload = JSON.parse(
    Buffer.from(data, "base64url").toString("utf8")
  ) as ApprovalPayload;

  const created = new Date(payload.createdAt).getTime();
  if (Date.now() - created > 7 * 24 * 60 * 60 * 1000) {
    throw new Error("Approval token has expired (7 days)");
  }

  return payload;
}