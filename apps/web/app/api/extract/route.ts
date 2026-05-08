// apps/web/app/api/extract/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parseInvoiceFromBase64 } from "@voltwise/invoice-parser/claude-parser";
import { notifyAdmin } from "@/lib/notify";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "application/pdf",
]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  let base64: string;
  let mediaType: string;

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    const bytes = await file.arrayBuffer();
    base64 = Buffer.from(bytes).toString("base64");
    mediaType = file.type;
  } else {
    const body = await req.json();
    if (!body.base64 || !body.mediaType) {
      return NextResponse.json({ error: "Provide base64 and mediaType" }, { status: 400 });
    }
    base64 = body.base64;
    mediaType = body.mediaType;
  }

  if (!ALLOWED_TYPES.has(mediaType)) {
    return NextResponse.json({ error: "Unsupported media type" }, { status: 415 });
  }

  try {
    const result = await parseInvoiceFromBase64(
      base64,
      mediaType as "image/jpeg" | "image/png" | "image/webp" | "application/pdf",
      apiKey
    );
    const { rawJson: _, ...safeResult } = result;
    return NextResponse.json({ success: true, data: safeResult });

  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    const isCreditsError =
      message.toLowerCase().includes("credit") ||
      message.toLowerCase().includes("insufficient") ||
      message.toLowerCase().includes("billing") ||
      message.includes("529") ||
      message.includes("402");

    if (isCreditsError) {
      notifyAdmin({ type: "api_credits_exhausted", error: message, endpoint: "/api/extract" }).catch(() => {});
    } else {
      notifyAdmin({ type: "api_error", error: message, endpoint: "/api/extract" }).catch(() => {});
    }

    return NextResponse.json(
      {
        error: isCreditsError
          ? "Service temporarily unavailable — the administrator has been notified."
          : "Extraction failed",
        details: message,
      },
      { status: isCreditsError ? 503 : 500 }
    );
  }
}
