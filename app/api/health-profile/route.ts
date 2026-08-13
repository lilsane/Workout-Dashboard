import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getHealthProfile, updateHealthProfile } from "@/lib/firebase";
import { validateHealthProfilePatch } from "@/lib/validate";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const profile = await getHealthProfile(session);
    return NextResponse.json(profile);
  } catch (error) {
    return toErrorResponse(error, "GET /api/health-profile");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const patch = validateHealthProfilePatch(body);
    await updateHealthProfile(session, patch);
    const profile = await getHealthProfile(session);
    return NextResponse.json(profile);
  } catch (error) {
    return toErrorResponse(error, "PATCH /api/health-profile");
  }
}
