// Firebase Admin SDK access — used exclusively by the admin panel routes,
// which need to fan out across every registered user (metrics, encryption
// migration). Everywhere else in this app, Firestore is accessed via REST
// with the caller's own ID token (see lib/firebase.ts) so per-user security
// rules are the enforcement mechanism; there is no other privileged path.
// This module is the one deliberate exception, gated by an admin-email check
// at the route level, and it bypasses Firestore rules entirely — treat every
// export here as unrestricted, cross-user access.
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { encrypt, decrypt } from "./encryption";
import { ApiError } from "./errors";
import type { HealthCondition, LoggedExercise } from "@/types";

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new ApiError(500, "FIREBASE_SERVICE_ACCOUNT is not configured on this server.");
  }

  let parsed: { project_id?: string; client_email?: string; private_key?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError(500, "FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
  }
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new ApiError(500, "FIREBASE_SERVICE_ACCOUNT is missing project_id, client_email, or private_key.");
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      // Service-account JSON stores real newlines, but env vars commonly
      // flatten them to the literal two-character sequence "\n".
      privateKey: parsed.private_key.replace(/\\n/g, "\n"),
    }),
  });
  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export interface AdminUser {
  uid: string;
  email: string;
}

// Every registered Auth user with a known email. Paginated since
// listUsers() caps at 1000 per page.
export async function listAllUsers(): Promise<AdminUser[]> {
  const auth = getAdminAuth();
  const users: AdminUser[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      if (u.email) users.push({ uid: u.uid, email: u.email });
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

export async function adminCountWorkouts(uid: string): Promise<number> {
  const db = getAdminDb();
  const snap = await db.collection("workouts").where("userId", "==", uid).count().get();
  return snap.data().count;
}

export async function adminHealthProfileExists(uid: string): Promise<boolean> {
  const db = getAdminDb();
  const doc = await db.collection("healthProfile").doc(uid).get();
  return doc.exists;
}

// Re-encrypts every workout note/pain description and health-profile
// condition for one user, in place — used by the admin encryption-migration
// route to force any legacy plaintext records to be encrypted at rest.
export async function adminMigrateUserEncryption(uid: string): Promise<{ workoutsMigrated: number; conditionsMigrated: number }> {
  const db = getAdminDb();
  let workoutsMigrated = 0;
  let conditionsMigrated = 0;

  const workoutsSnap = await db.collection("workouts").where("userId", "==", uid).get();
  for (const doc of workoutsSnap.docs) {
    const data = doc.data();
    const notes = typeof data.notes === "string" ? decrypt(data.notes) : null;
    const pain = typeof data.painDuringWorkout === "string" ? decrypt(data.painDuringWorkout) : null;
    const exercises = Array.isArray(data.exercises)
      ? (data.exercises as LoggedExercise[]).map((e) => ({ ...e, notes: e.notes ? decrypt(e.notes) : null }))
      : [];
    await doc.ref.set(
      {
        notes: notes ? encrypt(notes) : null,
        painDuringWorkout: pain ? encrypt(pain) : null,
        exercises: exercises.map((e) => ({ ...e, notes: e.notes ? encrypt(e.notes) : null })),
      },
      { merge: true }
    );
    workoutsMigrated++;
  }

  const profileDoc = await db.collection("healthProfile").doc(uid).get();
  if (profileDoc.exists) {
    const data = profileDoc.data() || {};
    const conditions = Array.isArray(data.conditions) ? (data.conditions as HealthCondition[]) : [];
    const reEncrypted = conditions.map((c) => ({
      ...c,
      description: encrypt(typeof c.description === "string" ? decrypt(c.description) : ""),
      notes: c.notes ? encrypt(decrypt(String(c.notes))) : null,
    }));
    if (reEncrypted.length > 0) {
      await profileDoc.ref.set({ conditions: reEncrypted }, { merge: true });
      conditionsMigrated = reEncrypted.length;
    }
  }

  return { workoutsMigrated, conditionsMigrated };
}
