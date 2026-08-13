import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listWorkouts } from "@/lib/firebase";
import { weeklyAnalysis } from "@/lib/coach";
import { toErrorResponse } from "@/lib/errors";
import { toLocalDateStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

// "How was my week?" — workout frequency, skipped days, push/pull and
// upper/lower balance, and which muscle groups were neglected or overtrained.
export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const windowDays = Number(req.nextUrl.searchParams.get("days")) || 7;
    const workouts = await listWorkouts(session, { limit: 200 });
    const analysis = weeklyAnalysis(workouts, windowDays, toLocalDateStr(new Date()));
    return NextResponse.json(analysis);
  } catch (error) {
    return toErrorResponse(error, "GET /api/coach/weekly");
  }
}
