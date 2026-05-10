import { NextRequest, NextResponse } from "next/server";
import { extractInvoice } from "@/lib/claude";
import { notifyAdmin } from "@/lib/notify";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED = new Set(["image/jpeg","image/png","image/webp","application/pdf"]);

async function extractWithRetry(base64: string, type: string, apiKey: string, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await extractInvoice(base64, type, apiKey);
    } catch (err: any) {
      const is429 = /429|rate.?limit|too.?many/i.test(err.message ?? "");
      if (is429 && i < attempts - 1) {
        await new Promise(r => setTimeout(r, 1500 * (i + 1))); // 1.5s, 3s
        continue;
      }
      throw err;
    }
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    const data = await extractWithRetry(base64, file.type, apiKey);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const msg = err.message ?? "unknown";
    const is429     = /429|rate.?limit|too.?many/i.test(msg);
    const isCredits = /credit|insufficient|billing|402/i.test(msg);

    notifyAdmin({
      type: isCredits ? "api_credits_exhausted" : is429 ? "api_rate_limit" : "api_error",
      error: msg,
      endpoint: "/api/extract"
    }).catch(() => {});

    if (is429) {
      return NextResponse.json(
        { error: "Too many requests — please wait a moment and try again." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: isCredits ? "Service temporarily unavailable." : "Extraction failed" },
      { status: isCredits ? 503 : 500 }
    );
  }
}