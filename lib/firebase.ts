import { randomUUID } from "crypto";
import { Session } from "./auth";
import { ApiError } from "./errors";
import { cacheGet, cacheSet, cacheInvalidate } from "./cache";
import { encrypt, decrypt } from "./encryption";
import type {
  BodyMeasurementSnapshot,
  DashboardSettings,
  HealthCondition,
  HealthProfile,
  LoggedExercise,
  NoteRecord,
  WorkoutEntry,
} from "@/types";
import type { WorkoutEntryInput } from "./validate";

/* ─── Firestore REST transport ───
 * All reads/writes go through the Firestore REST API authenticated with the
 * caller's own Firebase ID token (never an unauthenticated SDK instance), so
 * the per-user Firestore security rules are enforced by the database itself —
 * the API server holds no privileged credentials that could bypass them. */

const FIRESTORE_HOST = "https://firestore.googleapis.com/v1";

// Document ids appear in REST paths and backtick-quoted field masks; restrict
// them so neither can be broken out of. Covers Firestore auto-ids and UUIDs.
const DOC_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export function assertDocId(id: string, what: string): string {
  if (!DOC_ID_RE.test(id)) throw new ApiError(400, `Invalid ${what} id.`);
  return id;
}

function docsRoot(session: Session): string {
  return `${FIRESTORE_HOST}/projects/${session.config.projectId}/databases/(default)/documents`;
}

async function fsFetch<T = unknown>(session: Session, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.idToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (res.ok) {
    return res.json();
  }

  if (res.status === 404) throw new ApiError(404, "Record not found.");
  if (res.status === 403) throw new ApiError(403, "Permission denied by database security rules.");
  if (res.status === 401) throw new ApiError(401, "Database rejected the authentication token.");

  const detail = await res.text().catch(() => "");
  console.error(`Firestore request failed (${res.status}):`, detail.slice(0, 500));
  throw new ApiError(502, "Database request failed.");
}

/* ─── Firestore value encoding ─── */

// Mirrors the Firestore REST API's discriminated "Value" wire format.
type FirestoreValue =
  | { nullValue: null }
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

interface RunQueryRow {
  document?: FirestoreDocument;
}

function toValue(v: unknown): FirestoreValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === "object") return { mapValue: { fields: toFields(v as Record<string, unknown>) } };
  throw new ApiError(400, "Unsupported value type in payload.");
}

function toFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) fields[key] = toValue(value);
  }
  return fields;
}

function fromValue(v: FirestoreValue): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("mapValue" in v) return fromFields(v.mapValue?.fields || {});
  if ("arrayValue" in v) return (v.arrayValue?.values || []).map(fromValue);
  return null;
}

function fromFields(fields: Record<string, FirestoreValue> | undefined): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields || {})) {
    obj[key] = fromValue(value);
  }
  return obj;
}

function idFromName(name: string): string {
  return name.split("/").pop() || name;
}

// Runs a single-collection equality query scoped to the user. The userId
// filter also satisfies the security-rule ownership check for list queries.
async function runOwnedQuery(session: Session, collectionId: string): Promise<{ id: string; data: Record<string, unknown> }[]> {
  const body = {
    structuredQuery: {
      from: [{ collectionId }],
      where: {
        fieldFilter: {
          field: { fieldPath: "userId" },
          op: "EQUAL",
          value: { stringValue: session.uid },
        },
      },
    },
  };

  const rows = await fsFetch<RunQueryRow[]>(session, `${docsRoot(session)}:runQuery`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return (rows || [])
    .filter((row): row is Required<RunQueryRow> => !!row.document)
    .map((row) => ({ id: idFromName(row.document.name), data: fromFields(row.document.fields) }));
}

function cacheKeyFor(session: Session, ns: string): string {
  // Cache keys include the project id: uids are only unique within a Firebase
  // project, and callers may bring their own project via X-Firebase-Config —
  // without the project scope, a foreign project's uid could collide with (and
  // poison or leak) another user's cached data.
  return `${ns}:${session.config.projectId}:${session.uid}`;
}

/* ─── Health Profile ───
 * One doc per user (healthProfile/{userId}). Medical conditions and their
 * free-text notes are the most sensitive thing this app stores, so they're
 * encrypted at rest the same way expense titles were in the finance version
 * of this app — encrypt() on write, decrypt() on read. */

const HEALTH_PROFILE_CACHE_TTL = 3_600_000;

function computeBmi(heightCm?: number | null, weightKg?: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

function decryptCondition(raw: Record<string, unknown>): HealthCondition {
  return {
    id: String(raw.id || ""),
    description: typeof raw.description === "string" ? decrypt(raw.description) : "",
    addedAt: typeof raw.addedAt === "number" ? raw.addedAt : 0,
    resolved: raw.resolved === true,
    notes: typeof raw.notes === "string" && raw.notes ? decrypt(raw.notes) : null,
  };
}

function encryptCondition(c: HealthCondition): Record<string, unknown> {
  return {
    id: c.id,
    description: encrypt(c.description),
    addedAt: c.addedAt,
    resolved: c.resolved,
    notes: c.notes ? encrypt(c.notes) : null,
  };
}

const DEFAULT_HEALTH_PROFILE: HealthProfile = {
  ageYears: null,
  heightCm: null,
  weightKg: null,
  sex: null,
  dominantHand: null,
  goal: null,
  bmi: null,
  measurementHistory: [],
  conditions: [],
  experienceLevel: null,
  favoriteExercises: [],
  dislikedExercises: [],
  mobilityLimitations: [],
  recoverySpeed: null,
  sportsPlayed: [],
  footballFrequencyPerWeek: null,
  dailySteps: null,
  proteinIntakeG: null,
  waterIntakeL: null,
  sleepHours: null,
  updatedAt: 0,
};

export async function getHealthProfile(session: Session): Promise<HealthProfile> {
  const cacheKey = cacheKeyFor(session, "healthProfile");
  const cached = await cacheGet<HealthProfile>(cacheKey);
  if (cached) return cached;

  try {
    const doc = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/healthProfile/${session.uid}`);
    const data = fromFields(doc.fields);
    const conditionsRaw = Array.isArray(data.conditions) ? (data.conditions as Record<string, unknown>[]) : [];
    const measurementHistory = Array.isArray(data.measurementHistory) ? (data.measurementHistory as BodyMeasurementSnapshot[]) : [];

    const profile: HealthProfile = {
      ...DEFAULT_HEALTH_PROFILE,
      ageYears: (data.ageYears as number) ?? null,
      heightCm: (data.heightCm as number) ?? null,
      weightKg: (data.weightKg as number) ?? null,
      sex: (data.sex as HealthProfile["sex"]) ?? null,
      dominantHand: (data.dominantHand as HealthProfile["dominantHand"]) ?? null,
      goal: (data.goal as HealthProfile["goal"]) ?? null,
      bmi: computeBmi(data.heightCm as number, data.weightKg as number),
      measurementHistory,
      conditions: conditionsRaw.map(decryptCondition),
      experienceLevel: (data.experienceLevel as HealthProfile["experienceLevel"]) ?? null,
      favoriteExercises: Array.isArray(data.favoriteExercises) ? (data.favoriteExercises as string[]) : [],
      dislikedExercises: Array.isArray(data.dislikedExercises) ? (data.dislikedExercises as string[]) : [],
      mobilityLimitations: Array.isArray(data.mobilityLimitations) ? (data.mobilityLimitations as string[]) : [],
      recoverySpeed: (data.recoverySpeed as HealthProfile["recoverySpeed"]) ?? null,
      sportsPlayed: Array.isArray(data.sportsPlayed) ? (data.sportsPlayed as string[]) : [],
      footballFrequencyPerWeek: (data.footballFrequencyPerWeek as number) ?? null,
      dailySteps: (data.dailySteps as number) ?? null,
      proteinIntakeG: (data.proteinIntakeG as number) ?? null,
      waterIntakeL: (data.waterIntakeL as number) ?? null,
      sleepHours: (data.sleepHours as number) ?? null,
      updatedAt: (data.updatedAt as number) || 0,
    };
    await cacheSet(cacheKey, profile, HEALTH_PROFILE_CACHE_TTL);
    return profile;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      await cacheSet(cacheKey, DEFAULT_HEALTH_PROFILE, HEALTH_PROFILE_CACHE_TTL);
      return DEFAULT_HEALTH_PROFILE;
    }
    throw err;
  }
}

export async function updateHealthProfile(session: Session, patch: Record<string, unknown>): Promise<void> {
  const docData = { ...patch, updatedAt: Date.now() };
  const params = new URLSearchParams();
  Object.keys(docData).forEach((k) => params.append("updateMask.fieldPaths", k));

  await fsFetch(session, `${docsRoot(session)}/healthProfile/${session.uid}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(docData) }),
  });
  await cacheInvalidate(cacheKeyFor(session, "healthProfile"));
}

// Appends a new body-measurement snapshot. Firestore's REST PATCH always
// replaces the whole field it targets, so the array is read, merged
// client-side (newest first, capped), and written back in one PATCH —
// same pattern the finance app used for reconciliation history.
export async function addMeasurementSnapshot(session: Session, snapshot: BodyMeasurementSnapshot): Promise<BodyMeasurementSnapshot[]> {
  const profile = await getHealthProfile(session);
  const bmi = computeBmi(profile.heightCm, snapshot.weightKg ?? profile.weightKg);
  const next = [{ ...snapshot, bmi }, ...profile.measurementHistory.filter((m) => m.date !== snapshot.date)]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 500);

  const patch: Record<string, unknown> = { measurementHistory: next };
  // A fresh weigh-in also updates the profile's current weight so goal/BMI
  // calculations elsewhere always reflect the latest known value.
  if (snapshot.weightKg !== undefined && snapshot.weightKg !== null) patch.weightKg = snapshot.weightKg;

  await updateHealthProfile(session, patch);
  return next;
}

export async function addHealthCondition(session: Session, entry: Omit<HealthCondition, "id" | "addedAt">): Promise<HealthCondition[]> {
  const profile = await getHealthProfile(session);
  const condition: HealthCondition = { id: randomUUID(), addedAt: Date.now(), ...entry };
  const next = [condition, ...profile.conditions];
  await updateHealthProfile(session, { conditions: next.map(encryptCondition) });
  return next;
}

export async function updateHealthCondition(session: Session, id: string, patch: Partial<Omit<HealthCondition, "id" | "addedAt">>): Promise<HealthCondition[]> {
  const profile = await getHealthProfile(session);
  const next = profile.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c));
  if (!next.some((c) => c.id === id)) throw new ApiError(404, "Health condition not found.");
  await updateHealthProfile(session, { conditions: next.map(encryptCondition) });
  return next;
}

export async function removeHealthCondition(session: Session, id: string): Promise<HealthCondition[]> {
  const profile = await getHealthProfile(session);
  const next = profile.conditions.filter((c) => c.id !== id);
  await updateHealthProfile(session, { conditions: next.map(encryptCondition) });
  return next;
}

/* ─── Workouts ─── */

const WORKOUT_CACHE_TTL = 3_600_000;

function decryptExercise(e: LoggedExercise): LoggedExercise {
  return { ...e, notes: e.notes ? decrypt(e.notes) : null };
}

function encryptExercise(e: LoggedExercise): Record<string, unknown> {
  return { ...e, notes: e.notes ? encrypt(e.notes) : null };
}

function estimatedVolume(exercises: LoggedExercise[]): number {
  let total = 0;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      if (s.reps && s.weight) total += s.reps * s.weight;
    }
  }
  return Math.round(total);
}

async function getRawWorkouts(session: Session): Promise<WorkoutEntry[]> {
  const cacheKey = cacheKeyFor(session, "workouts");
  const cached = await cacheGet<WorkoutEntry[]>(cacheKey);
  if (cached) return cached;

  const rows = await runOwnedQuery(session, "workouts");
  const records: WorkoutEntry[] = rows.map(({ id, data }) => ({
    id,
    date: (data.date as string) || "",
    workoutType: (data.workoutType as WorkoutEntry["workoutType"]) || "other",
    musclesWorked: Array.isArray(data.musclesWorked) ? (data.musclesWorked as WorkoutEntry["musclesWorked"]) : [],
    exercises: Array.isArray(data.exercises) ? (data.exercises as LoggedExercise[]).map(decryptExercise) : [],
    estimatedVolume: typeof data.estimatedVolume === "number" ? data.estimatedVolume : null,
    intensity: (data.intensity as WorkoutEntry["intensity"]) ?? null,
    notes: typeof data.notes === "string" && data.notes ? decrypt(data.notes) : null,
    recoveryStatus: (data.recoveryStatus as WorkoutEntry["recoveryStatus"]) ?? null,
    painDuringWorkout: typeof data.painDuringWorkout === "string" && data.painDuringWorkout ? decrypt(data.painDuringWorkout) : null,
    exercisesMissed: Array.isArray(data.exercisesMissed) ? (data.exercisesMissed as string[]) : [],
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
  }));

  records.sort((a, b) => (b.date === a.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)));
  await cacheSet(cacheKey, records, WORKOUT_CACHE_TTL);
  return records;
}

export async function listWorkouts(
  session: Session,
  filters?: { from?: string; to?: string; workoutType?: string; limit?: number }
): Promise<WorkoutEntry[]> {
  let records = await getRawWorkouts(session);
  if (filters?.from) records = records.filter((w) => w.date >= filters.from!);
  if (filters?.to) records = records.filter((w) => w.date <= filters.to!);
  if (filters?.workoutType) records = records.filter((w) => w.workoutType === filters.workoutType);
  if (filters?.limit) records = records.slice(0, filters.limit);
  return records;
}

export async function createWorkout(session: Session, entry: WorkoutEntryInput): Promise<{ id: string }> {
  const docData = {
    userId: session.uid,
    date: entry.date || new Date().toISOString().slice(0, 10),
    workoutType: entry.workoutType,
    musclesWorked: entry.musclesWorked || [],
    exercises: entry.exercises.map(encryptExercise),
    estimatedVolume: estimatedVolume(entry.exercises),
    intensity: entry.intensity ?? null,
    notes: entry.notes ? encrypt(entry.notes) : null,
    recoveryStatus: entry.recoveryStatus ?? null,
    painDuringWorkout: entry.painDuringWorkout ? encrypt(entry.painDuringWorkout) : null,
    exercisesMissed: entry.exercisesMissed || [],
    createdAt: Date.now(),
  };

  const created = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/workouts`, {
    method: "POST",
    body: JSON.stringify({ fields: toFields(docData) }),
  });

  await cacheInvalidate(cacheKeyFor(session, "workouts"));
  return { id: idFromName(created.name) };
}

export async function updateWorkout(session: Session, id: string, patch: Partial<WorkoutEntryInput>): Promise<{ id: string }> {
  assertDocId(id, "workout");
  const updateData: Record<string, unknown> = {};
  if (patch.date !== undefined) updateData.date = patch.date;
  if (patch.workoutType !== undefined) updateData.workoutType = patch.workoutType;
  if (patch.musclesWorked !== undefined) updateData.musclesWorked = patch.musclesWorked;
  if (patch.exercises !== undefined) {
    updateData.exercises = patch.exercises.map(encryptExercise);
    updateData.estimatedVolume = estimatedVolume(patch.exercises);
  }
  if (patch.intensity !== undefined) updateData.intensity = patch.intensity;
  if (patch.notes !== undefined) updateData.notes = patch.notes ? encrypt(patch.notes) : null;
  if (patch.recoveryStatus !== undefined) updateData.recoveryStatus = patch.recoveryStatus;
  if (patch.painDuringWorkout !== undefined) updateData.painDuringWorkout = patch.painDuringWorkout ? encrypt(patch.painDuringWorkout) : null;
  if (patch.exercisesMissed !== undefined) updateData.exercisesMissed = patch.exercisesMissed;

  const params = new URLSearchParams();
  for (const field of Object.keys(updateData)) params.append("updateMask.fieldPaths", field);
  params.append("currentDocument.exists", "true");

  await fsFetch(session, `${docsRoot(session)}/workouts/${id}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(updateData) }),
  });

  await cacheInvalidate(cacheKeyFor(session, "workouts"));
  return { id };
}

export async function deleteWorkout(session: Session, id: string): Promise<{ id: string }> {
  assertDocId(id, "workout");
  await fsFetch(session, `${docsRoot(session)}/workouts/${id}?currentDocument.exists=true`, { method: "DELETE" });
  await cacheInvalidate(cacheKeyFor(session, "workouts"));
  return { id };
}

/* ─── Notes ─── */

const NOTE_CACHE_TTL = 3_600_000;

export async function getNote(session: Session): Promise<NoteRecord | null> {
  const cacheKey = cacheKeyFor(session, "note");
  const cached = await cacheGet<NoteRecord | null>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const res = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/notes/${session.uid}`);
    const data = fromFields(res.fields || {});
    const record = { content: typeof data.content === "string" && data.content ? decrypt(data.content) : "", updatedAt: (data.updatedAt as number) || 0 };
    await cacheSet(cacheKey, record, NOTE_CACHE_TTL);
    return record;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      await cacheSet(cacheKey, null, NOTE_CACHE_TTL);
      return null;
    }
    throw err;
  }
}

export async function updateNote(session: Session, content: string): Promise<void> {
  const docData = { content: content ? encrypt(content) : "", updatedAt: Date.now() };
  const params = new URLSearchParams();
  params.append("updateMask.fieldPaths", "content");
  params.append("updateMask.fieldPaths", "updatedAt");

  await fsFetch(session, `${docsRoot(session)}/notes/${session.uid}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(docData) }),
  });
  await cacheInvalidate(cacheKeyFor(session, "note"));
}

/* ─── Settings ─── */

const SETTINGS_CACHE_TTL = 3_600_000;
const DEFAULT_SETTINGS: DashboardSettings = { weightUnit: "kg", distanceUnit: "km", isPro: false, updatedAt: 0 };

export async function getSettings(session: Session): Promise<DashboardSettings> {
  const cacheKey = cacheKeyFor(session, "settings");
  const cached = await cacheGet<DashboardSettings>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/settings/${session.uid}`);
    const data = fromFields(res.fields || {});
    const record: DashboardSettings = {
      weightUnit: (data.weightUnit as DashboardSettings["weightUnit"]) || "kg",
      distanceUnit: (data.distanceUnit as DashboardSettings["distanceUnit"]) || "km",
      isPro: data.isPro === true,
      updatedAt: (data.updatedAt as number) || 0,
    };
    await cacheSet(cacheKey, record, SETTINGS_CACHE_TTL);
    return record;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      await cacheSet(cacheKey, DEFAULT_SETTINGS, SETTINGS_CACHE_TTL);
      return DEFAULT_SETTINGS;
    }
    throw err;
  }
}

export async function updateSettings(session: Session, updates: Partial<Omit<DashboardSettings, "updatedAt" | "isPro">>): Promise<void> {
  const docData = { ...updates, updatedAt: Date.now() };
  const params = new URLSearchParams();
  Object.keys(docData).forEach((k) => params.append("updateMask.fieldPaths", k));

  await fsFetch(session, `${docsRoot(session)}/settings/${session.uid}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(docData) }),
  });
  await cacheInvalidate(cacheKeyFor(session, "settings"));
}

export { computeBmi };
