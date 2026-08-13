import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { deleteWorkout, updateWorkout } from "@/lib/firebase";
import { validateWorkoutPatch } from "@/lib/validate";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    const body = await req.json();
    const patch = validateWorkoutPatch(body);
    const result = await updateWorkout(session, id, patch);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, "PATCH /api/workouts/[id]");
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    const result = await deleteWorkout(session, id);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, "DELETE /api/workouts/[id]");
  }
}
