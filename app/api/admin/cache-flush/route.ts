import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { ApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail || session.user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }
    if (!redis) {
      return NextResponse.json({ error: "Redis cache is offline." }, { status: 500 });
    }

    await redis.flushdb();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Cache flush failed:", error);
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || "Failed to flush cache" }, { status: 500 });
  }
}
