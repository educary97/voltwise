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
  const url   = process.env.UPSTASH_REDIS_REST_URL;
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
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Upstash not configured");
  const res = await fetch(`${url}/lpush/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`Upstash error: ${res.status}`);
}

async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `ratelimit:signup:${ip}`;
  const windowSecs = 3600;
  const maxRequests = 3;
  try {
    const url   = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return true;
    const incrRes = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const incrData = await incrRes.json();
    const count = incrData.result;
    if (count === 1) {
      await fetch(`${url}/expire/${encodeURIComponent(key)}/${windowSecs}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    return count <= maxRequests;
  } catch {
    return true;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { inviteCode, ...data } = parsed.data;

    const validCode = process.env.INVITE_CODE;
    if (!validCode || inviteCode !== validCode) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 401 });
    }

    const userId = data.email.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const url   = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    const existsRes = await fetch(`${url}/exists/${encodeURIComponent(`user:${userId}`)}`, {
      headers: { Authorization: `Bearer ${token!}` },
    });
    const existsData = await existsRes.json();

    if (existsData.result === 1) {
      const user = { ...data, userId, updatedAt: new Date().toISOString(), active: true };
      await upstashSet(`user:${userId}`, user);
      return NextResponse.json({ success: true, userId, updated: true });
    }

    const user = { ...data, userId, createdAt: new Date().toISOString(), active: true };
    await upstashSet(`user:${userId}`, user);
    await upstashLPush("users:all", userId);

    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    console.error("[signup]", err);
    return NextResponse.json({ error: err.message ?? "Signup failed" }, { status: 500 });
  }
}