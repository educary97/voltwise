// apps/web/lib/usage.ts
// Tracks comparison count and fires milestone notifications.
// Uses Vercel KV if configured, otherwise an in-memory counter (resets on redeploy).
// For production with persistent counts, add VERCEL_KV credentials.

import { notifyAdmin } from "./notify";

const MILESTONES = [10, 50, 100, 250, 500, 1000];

// In-memory fallback (works fine for low traffic)
let inMemoryCount = 0;

export async function incrementUsage(): Promise<number> {
  let count: number;

  // Try Vercel KV if configured
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    count = await kvIncrement();
  } else {
    count = ++inMemoryCount;
  }

  // Fire milestone notification
  if (MILESTONES.includes(count)) {
    notifyAdmin({ type: "usage_milestone", comparisons: count }).catch(() => {});
  }

  return count;
}

async function kvIncrement(): Promise<number> {
  try {
    const res = await fetch(
      `${process.env.KV_REST_API_URL}/incr/voltwise:comparisons`,
      { headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` } }
    );
    const data = await res.json();
    return Number(data.result) || 0;
  } catch {
    return ++inMemoryCount;
  }
}
