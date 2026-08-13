import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { adminMigrateUserEncryption, listAllUsers } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// Re-saves every user's workout notes, pain descriptions, and health
// condition records through the encryption path, in case any records were
// ever written before ENCRYPTION_KEY was configured.
export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail || session.user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const users = await listAllUsers();
    let workoutsMigrated = 0;
    let conditionsMigrated = 0;
    let usersProcessed = 0;

    for (const u of users) {
      try {
        const result = await adminMigrateUserEncryption(u.uid);
        workoutsMigrated += result.workoutsMigrated;
        conditionsMigrated += result.conditionsMigrated;
        usersProcessed++;
      } catch (e) {
        console.error(`Encryption migration failed for user ${u.uid}:`, e);
      }
    }

    return NextResponse.json({ success: true, usersProcessed, workoutsMigrated, conditionsMigrated });
  } catch (error: any) {
    console.error("Encryption migration failed:", error);
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || "Failed to run migration" }, { status: 500 });
  }
}
