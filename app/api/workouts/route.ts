import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createWorkout, listWorkouts } from "@/lib/firebase";
import { validateWorkoutEntry } from "@/lib/validate";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

// Lists workout sessions, optionally filtered by date range or workout type.
// Supports the "How was my week?" flow — call with from=<7 days ago>.
export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const { searchParams } = req.nextUrl;
    const workouts = await listWorkouts(session, {
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      workoutType: searchParams.get("workoutType") || undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    });
    return NextResponse.json(workouts);
  } catch (error) {
    return toErrorResponse(error, "GET /api/workouts");
  }
}

// Logs a full workout session — the "I went to gym" flow. Estimated volume
// (sets × reps × weight) and, when not supplied, musclesWorked are both
// derived server-side from the logged exercises.
export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const entry = validateWorkoutEntry(body);
    const result = await createWorkout(session, entry);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, "POST /api/workouts");
  }
}
