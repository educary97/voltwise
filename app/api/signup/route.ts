// app/api/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const Schema = z.object({
  inviteCode:      z.string().min(1),
  name:            z.string().min(1),
  email:           z.string().email(),
  phone:           z.string().min(9),
  nif:             z.string().min(9),
  iban:            z.string().min(15),
  cpe:             z.string().min(10),
  address:         z.string().min(5),
  currentSupplier: z.string().min(1),
  currentPlan:     z.string().min(1),
  monthlyKwh:      z.number().min(1),
  monthlyCost:     z.number().min(1),
  powerKva:        z.number().min(1),
});

async function upstashSet(key: string, value: unknown) {
  const url  = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Upstash not configured");
  const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(JSON.stringify(value)),
  });
  if (!res.ok) throw new Error(`Upstash error: ${res.status}`);
}

async function upstashLPush(key: string, value: string) {
  const url  = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Upstash not configured");
  const res = await fetch(`${url}/lpush/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`Upstash error: ${res.status}`);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { inviteCode, ...data } = parsed.data;

    // Validate invite code
    const validCode = process.env.INVITE_CODE;
    if (!validCode || inviteCode !== validCode) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 401 });
    }

    // Generate a simple user ID from email
    const userId = data.email.toLowerCase().replace(/[^a-z0-9]/g, "_");

    const user = {
      ...data,
      userId,
      createdAt: new Date().toISOString(),
      active: true,
    };

    // Save user profile
    await upstashSet(`user:${userId}`, user);

    // Add to list of all users (for agent to iterate over)
    await upstashLPush("users:all", userId);

    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    console.error("[signup]", err);
    return NextResponse.json({ error: err.message ?? "Signup failed" }, { status: 500 });
  }
}
