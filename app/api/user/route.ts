// app/api/user/route.ts
import { NextRequest, NextResponse } from "next/server";

async function upstashGet(key: string) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Upstash not configured");
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.result) return null;
  return JSON.parse(json.result);
}

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const userId = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const user = await upstashGet(`user:${userId}`);

    if (!user) return NextResponse.json({ found: false });

    // Return only the fields needed to pre-fill the app
    // Never return NIF, IBAN, CPE to the browser
    return NextResponse.json({
      found: true,
      name:            user.name,
      currentSupplier: user.currentSupplier,
      currentPlan:     user.currentPlan,
      monthlyKwh:      user.monthlyKwh,
      monthlyCost:     user.monthlyCost,
      powerKva:        user.powerKva,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
