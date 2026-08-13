import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/firebase";
import { validateSettingsPatch } from "@/lib/validate";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const settings = await getSettings(session);
    return NextResponse.json(settings);
  } catch (error) {
    return toErrorResponse(error, "GET /api/settings");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const patch = validateSettingsPatch(body);
    await updateSettings(session, patch);
    const settings = await getSettings(session);
    return NextResponse.json(settings);
  } catch (error) {
    return toErrorResponse(error, "PATCH /api/settings");
  }
}
