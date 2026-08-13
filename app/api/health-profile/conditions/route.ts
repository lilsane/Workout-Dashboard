import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { addHealthCondition } from "@/lib/firebase";
import { validateHealthCondition } from "@/lib/validate";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

// Adds a permanent medical/injury record (e.g. "C4-C5 cervical disc
// herniation"). Any future condition mentioned in chat should land here so
// it's never forgotten across sessions.
export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const entry = validateHealthCondition(body);
    const conditions = await addHealthCondition(session, entry);
    return NextResponse.json({ conditions });
  } catch (error) {
    return toErrorResponse(error, "POST /api/health-profile/conditions");
  }
}
