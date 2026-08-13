import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getHealthProfile } from "@/lib/firebase";
import { exerciseSafetyForProfile, searchExercises } from "@/lib/exerciseDatabase";
import { toErrorResponse } from "@/lib/errors";
import type { ExerciseCategory, MuscleGroup } from "@/types";

export const dynamic = "force-dynamic";

// Searches the exercise encyclopedia by name/alias/category/muscle/equipment
// and flags each result as safe/unsafe against the caller's active health
// conditions — "Whether it is safe for my conditions" from the coach prompt.
export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const { searchParams } = req.nextUrl;
    const profile = await getHealthProfile(session);

    const results = searchExercises(searchParams.get("q") || undefined, {
      category: (searchParams.get("category") as ExerciseCategory) || undefined,
      muscle: (searchParams.get("muscle") as MuscleGroup) || undefined,
      equipment: searchParams.get("equipment") || undefined,
    }).slice(0, 50);

    const withSafety = results.map((exercise) => ({
      ...exercise,
      safety: exerciseSafetyForProfile(exercise, profile),
    }));

    return NextResponse.json(withSafety);
  } catch (error) {
    return toErrorResponse(error, "GET /api/exercises");
  }
}
