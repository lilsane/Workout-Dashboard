import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { addMeasurementSnapshot } from "@/lib/firebase";
import { validateMeasurementSnapshot } from "@/lib/validate";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

// Logs a new body-measurement snapshot (weight, waist, chest, body fat %, ...)
// and recomputes BMI from the profile's current height. Returns the full,
// newest-first measurement history.
export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const snapshot = validateMeasurementSnapshot(body);
    const history = await addMeasurementSnapshot(session, snapshot);
    return NextResponse.json({ measurementHistory: history });
  } catch (error) {
    return toErrorResponse(error, "POST /api/health-profile/measurements");
  }
}
