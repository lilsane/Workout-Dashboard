import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getHealthProfile, listWorkouts } from "@/lib/firebase";
import { recommendNextWorkout } from "@/lib/coach";
import { toErrorResponse } from "@/lib/errors";
import { toLocalDateStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

// "Whether tomorrow should be Rest / Cardio / Push / Pull / Legs /
// Shoulders / Arms / Football / Recovery, based on my recovery." Never
// suggests consecutive heavy sessions for the same muscle group, and
// defers to a light recovery day (with a note to seek medical review) if
// the last session flagged pain.
export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const [profile, workouts] = await Promise.all([getHealthProfile(session), listWorkouts(session, { limit: 60 })]);
    const recommendation = recommendNextWorkout(workouts, profile, toLocalDateStr(new Date()));
    return NextResponse.json(recommendation);
  } catch (error) {
    return toErrorResponse(error, "GET /api/coach/recommend");
  }
}
