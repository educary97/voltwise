import { NextRequest, NextResponse } from "next/server";
import { extractInvoice } from "@/lib/claude";
import { notifyAdmin } from "@/lib/notify";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED = new Set(["image/jpeg","image/png","image/webp","application/pdf"]);

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error:"ANTHROPIC_API_KEY not set" },{status:500});

  const formData = await req.formData();
  const file = formData.get("file") as File|null;
  if (!file) return NextResponse.json({ error:"No file provided" },{status:400});
  if (file.size > 10*1024*1024) return NextResponse.json({ error:"File too large (max 10 MB)" },{status:413});
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error:"Unsupported file type" },{status:415});

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    const data = await extractInvoice(base64, file.type, apiKey);
    return NextResponse.json({ success:true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const isCredits = /credit|insufficient|billing|529|402/i.test(msg);
    notifyAdmin({ type: isCredits?"api_credits_exhausted":"api_error", error:msg, endpoint:"/api/extract" }).catch(()=>{});
    return NextResponse.json(
      { error: isCredits ? "Service temporarily unavailable — the admin has been notified." : "Extraction failed" },
      { status: isCredits?503:500 }
    );
  }
}
