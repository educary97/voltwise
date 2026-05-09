// src/lib/agent/approvalToken.ts
// Encodes the full email draft + metadata into a signed URL token
// No database needed — the draft travels inside the URL

import crypto from "crypto";
import { DraftedEmail } from "./draftSwitchEmail";
import { ComparisonResult } from "./compareToCurrentPlan";

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
  // Encode payload as base64url
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");

  // HMAC signature to prevent tampering
  const sig = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  return `${appBaseUrl}/approve?data=${data}&sig=${sig}`;
}

export function verifyAndDecodeApprovalUrl(
  data: string,
  sig: string,
  secret: string
): ApprovalPayload {
  // Verify signature
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  if (expectedSig !== sig) {
    throw new Error("Invalid approval token signature");
  }

  // Decode payload
  const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as ApprovalPayload;

  // Check token isn't more than 7 days old
  const created = new Date(payload.createdAt).getTime();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (now - created > sevenDays) {
    throw new Error("Approval token has expired (7 days)");
  }

  return payload;
}
