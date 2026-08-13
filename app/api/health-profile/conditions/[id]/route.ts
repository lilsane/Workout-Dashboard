import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { removeHealthCondition, updateHealthCondition } from "@/lib/firebase";
import { ApiError, toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

// Marks a condition resolved/unresolved, or edits its notes. Use this
// instead of deleting when a condition heals — "Never forget these
// conditions unless I explicitly tell you they have resolved" — so the
// history stays intact rather than disappearing.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    const body = await req.json();
    if (typeof body !== "object" || body === null) throw new ApiError(400, "Body must be a JSON object.");
    const patch: { resolved?: boolean; notes?: string | null; description?: string } = {};
    if (typeof body.resolved === "boolean") patch.resolved = body.resolved;
    if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes).slice(0, 1000) : null;
    if (body.description !== undefined) patch.description = String(body.description).slice(0, 300);
    const conditions = await updateHealthCondition(session, id, patch);
    return NextResponse.json({ conditions });
  } catch (error) {
    return toErrorResponse(error, "PATCH /api/health-profile/conditions/[id]");
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    const conditions = await removeHealthCondition(session, id);
    return NextResponse.json({ conditions });
  } catch (error) {
    return toErrorResponse(error, "DELETE /api/health-profile/conditions/[id]");
  }
}
