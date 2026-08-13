import { randomUUID } from "crypto";
import { ApiError } from "./errors";
import type {
  BodyMeasurementSnapshot,
  DashboardSettings,
  ExperienceLevel,
  Goal,
  HealthCondition,
  HealthProfile,
  LoggedExercise,
  LoggedSet,
  MuscleGroup,
  RecoverySpeed,
  Sex,
  WorkoutEntry,
  WorkoutType,
} from "@/types";

const SEXES: readonly Sex[] = ["male", "female", "other"];
const GOALS: readonly Goal[] = ["muscle_gain", "fat_loss", "strength", "athletic_performance", "rehabilitation", "combination"];
const EXPERIENCE_LEVELS: readonly ExperienceLevel[] = ["beginner", "intermediate", "advanced"];
const RECOVERY_SPEEDS: readonly RecoverySpeed[] = ["slow", "average", "fast"];
const DOMINANT_HANDS = ["left", "right", "ambidextrous"] as const;

export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  "chest", "back", "shoulders", "front_delts", "side_delts", "rear_delts",
  "biceps", "triceps", "forearms", "core", "lower_back",
  "glutes", "quads", "hamstrings", "calves", "neck", "cardio",
];

const WORKOUT_TYPES: readonly WorkoutType[] = [
  "push", "pull", "legs", "upper_body", "lower_body", "full_body",
  "cardio", "mobility", "football", "rehab", "recovery", "other",
];

const WEIGHT_UNITS = ["kg", "lb"] as const;
const DISTANCE_UNITS = ["km", "mi"] as const;

export const MAX_WORKOUT_EXERCISES = 40;
export const MAX_SETS_PER_EXERCISE = 30;

function badRequest(message: string): never {
  throw new ApiError(400, message);
}

function requireObject(body: unknown, what: string): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    badRequest(`${what} must be a JSON object.`);
  }
  return body as Record<string, unknown>;
}

function asTrimmedString(value: unknown, field: string, maxLen: number, required: boolean): string | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) badRequest(`Field '${field}' is required.`);
    return undefined;
  }
  if (typeof value !== "string") badRequest(`Field '${field}' must be a string.`);
  const trimmed = (value as string).trim();
  if (required && !trimmed) badRequest(`Field '${field}' must not be empty.`);
  if (trimmed.length > maxLen) badRequest(`Field '${field}' must be at most ${maxLen} characters.`);
  return trimmed || undefined;
}

function asNullableNumber(value: unknown, field: string, opts: { min?: number; max?: number } = {}): number | null {
  if (value === undefined || value === null || value === "") return null;
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isFinite(num)) badRequest(`Field '${field}' must be a number.`);
  const n = num as number;
  if (opts.min !== undefined && n < opts.min) badRequest(`Field '${field}' must be >= ${opts.min}.`);
  if (opts.max !== undefined && n > opts.max) badRequest(`Field '${field}' must be <= ${opts.max}.`);
  return n;
}

function asDate(value: unknown, field: string, required: boolean): string | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) badRequest(`Field '${field}' is required.`);
    return undefined;
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    badRequest(`Field '${field}' must be a date in YYYY-MM-DD format.`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (isNaN(parsed.getTime())) badRequest(`Field '${field}' is not a valid calendar date.`);
  return value as string;
}

function asEnum<T extends string>(value: unknown, field: string, allowed: readonly T[], required: boolean): T | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) badRequest(`Field '${field}' is required. One of: ${allowed.join(", ")}.`);
    return undefined;
  }
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    badRequest(`Field '${field}' must be one of: ${allowed.join(", ")}.`);
  }
  return value as T;
}

function asStringArray(value: unknown, field: string, maxItems: number, maxLen: number): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) badRequest(`Field '${field}' must be an array of strings.`);
  const arr = value as unknown[];
  if (arr.length > maxItems) badRequest(`Field '${field}' must contain at most ${maxItems} items.`);
  return arr.map((v, i) => asTrimmedString(v, `${field}[${i}]`, maxLen, true)!);
}

function asMuscleArray(value: unknown, field: string): MuscleGroup[] {
  const arr = asStringArray(value, field, 20, 40);
  return arr.map((m) => {
    if (!MUSCLE_GROUPS.includes(m as MuscleGroup)) badRequest(`Field '${field}' has an invalid muscle group: '${m}'. One of: ${MUSCLE_GROUPS.join(", ")}.`);
    return m as MuscleGroup;
  });
}

/* ─── Health Profile ─── */

export function validateHealthProfilePatch(body: unknown): Partial<Omit<HealthProfile, "updatedAt" | "measurementHistory" | "conditions">> {
  const b = requireObject(body, "Health profile patch");
  const patch: Partial<HealthProfile> = {};

  if (b.ageYears !== undefined) patch.ageYears = asNullableNumber(b.ageYears, "ageYears", { min: 5, max: 120 });
  if (b.heightCm !== undefined) patch.heightCm = asNullableNumber(b.heightCm, "heightCm", { min: 50, max: 260 });
  if (b.weightKg !== undefined) patch.weightKg = asNullableNumber(b.weightKg, "weightKg", { min: 15, max: 400 });
  if (b.sex !== undefined) patch.sex = (asEnum(b.sex, "sex", SEXES, false) ?? null) as HealthProfile["sex"];
  if (b.dominantHand !== undefined) patch.dominantHand = (asEnum(b.dominantHand, "dominantHand", DOMINANT_HANDS, false) ?? null) as HealthProfile["dominantHand"];
  if (b.goal !== undefined) patch.goal = (asEnum(b.goal, "goal", GOALS, false) ?? null) as HealthProfile["goal"];

  if (b.experienceLevel !== undefined) patch.experienceLevel = (asEnum(b.experienceLevel, "experienceLevel", EXPERIENCE_LEVELS, false) ?? null) as HealthProfile["experienceLevel"];
  if (b.recoverySpeed !== undefined) patch.recoverySpeed = (asEnum(b.recoverySpeed, "recoverySpeed", RECOVERY_SPEEDS, false) ?? null) as HealthProfile["recoverySpeed"];
  if (b.favoriteExercises !== undefined) patch.favoriteExercises = asStringArray(b.favoriteExercises, "favoriteExercises", 100, 120);
  if (b.dislikedExercises !== undefined) patch.dislikedExercises = asStringArray(b.dislikedExercises, "dislikedExercises", 100, 120);
  if (b.mobilityLimitations !== undefined) patch.mobilityLimitations = asStringArray(b.mobilityLimitations, "mobilityLimitations", 50, 200);
  if (b.sportsPlayed !== undefined) patch.sportsPlayed = asStringArray(b.sportsPlayed, "sportsPlayed", 30, 60);
  if (b.footballFrequencyPerWeek !== undefined) patch.footballFrequencyPerWeek = asNullableNumber(b.footballFrequencyPerWeek, "footballFrequencyPerWeek", { min: 0, max: 14 });
  if (b.dailySteps !== undefined) patch.dailySteps = asNullableNumber(b.dailySteps, "dailySteps", { min: 0, max: 100_000 });
  if (b.proteinIntakeG !== undefined) patch.proteinIntakeG = asNullableNumber(b.proteinIntakeG, "proteinIntakeG", { min: 0, max: 1000 });
  if (b.waterIntakeL !== undefined) patch.waterIntakeL = asNullableNumber(b.waterIntakeL, "waterIntakeL", { min: 0, max: 20 });
  if (b.sleepHours !== undefined) patch.sleepHours = asNullableNumber(b.sleepHours, "sleepHours", { min: 0, max: 24 });

  if (Object.keys(patch).length === 0) badRequest("Patch body must include at least one recognized health profile field.");
  return patch;
}

export function validateMeasurementSnapshot(body: unknown): BodyMeasurementSnapshot {
  const b = requireObject(body, "Measurement snapshot");
  return {
    date: asDate(b.date, "date", false) || new Date().toISOString().slice(0, 10),
    weightKg: asNullableNumber(b.weightKg, "weightKg", { min: 15, max: 400 }),
    neckCm: asNullableNumber(b.neckCm, "neckCm", { min: 10, max: 100 }),
    chestCm: asNullableNumber(b.chestCm, "chestCm", { min: 20, max: 250 }),
    waistCm: asNullableNumber(b.waistCm, "waistCm", { min: 20, max: 250 }),
    hipCm: asNullableNumber(b.hipCm, "hipCm", { min: 20, max: 250 }),
    shoulderWidthCm: asNullableNumber(b.shoulderWidthCm, "shoulderWidthCm", { min: 10, max: 100 }),
    upperArmCm: asNullableNumber(b.upperArmCm, "upperArmCm", { min: 10, max: 100 }),
    forearmCm: asNullableNumber(b.forearmCm, "forearmCm", { min: 10, max: 100 }),
    thighCm: asNullableNumber(b.thighCm, "thighCm", { min: 10, max: 150 }),
    calfCm: asNullableNumber(b.calfCm, "calfCm", { min: 10, max: 100 }),
    wristCm: asNullableNumber(b.wristCm, "wristCm", { min: 5, max: 50 }),
    bodyFatPercent: asNullableNumber(b.bodyFatPercent, "bodyFatPercent", { min: 1, max: 70 }),
    bmi: null, // computed server-side from height + weight, never trusted from the client
  };
}

export function validateHealthCondition(body: unknown): Omit<HealthCondition, "id" | "addedAt"> {
  const b = requireObject(body, "Health condition");
  return {
    description: asTrimmedString(b.description, "description", 300, true)!,
    resolved: b.resolved === true,
    notes: asTrimmedString(b.notes, "notes", 1000, false) ?? null,
  };
}

/* ─── Workouts ─── */

function validateLoggedSet(raw: unknown, index: number): LoggedSet {
  const b = requireObject(raw, "Set");
  try {
    return {
      reps: asNullableNumber(b.reps, "reps", { min: 0, max: 5000 }),
      weight: asNullableNumber(b.weight, "weight", { min: 0, max: 2000 }),
      unit: asEnum(b.unit, "unit", WEIGHT_UNITS, false) ?? "kg",
      rpe: asNullableNumber(b.rpe, "rpe", { min: 1, max: 10 }),
    };
  } catch (error) {
    if (error instanceof ApiError) throw new ApiError(400, `Set ${index + 1}: ${error.message}`);
    throw error;
  }
}

function validateLoggedExercise(raw: unknown, index: number): LoggedExercise {
  const b = requireObject(raw, "Exercise");
  try {
    const sets = Array.isArray(b.sets) ? (b.sets as unknown[]) : [];
    if (sets.length > MAX_SETS_PER_EXERCISE) badRequest(`Field 'sets' must contain at most ${MAX_SETS_PER_EXERCISE} entries.`);
    return {
      name: asTrimmedString(b.name, "name", 150, true)!,
      muscles: asMuscleArray(b.muscles, "muscles"),
      sets: sets.map((s, i) => validateLoggedSet(s, i)),
      notes: asTrimmedString(b.notes, "notes", 500, false) ?? null,
    };
  } catch (error) {
    if (error instanceof ApiError) throw new ApiError(400, `Exercise ${index + 1}: ${error.message}`);
    throw error;
  }
}

export interface WorkoutEntryInput {
  date?: string;
  workoutType: WorkoutType;
  musclesWorked?: MuscleGroup[];
  exercises: LoggedExercise[];
  intensity?: "light" | "moderate" | "heavy" | null;
  notes?: string | null;
  recoveryStatus?: "fresh" | "normal" | "fatigued" | "sore" | null;
  painDuringWorkout?: string | null;
  exercisesMissed?: string[];
}

export function validateWorkoutEntry(body: unknown): WorkoutEntryInput {
  const b = requireObject(body, "Workout entry");
  const exercisesRaw = Array.isArray(b.exercises) ? (b.exercises as unknown[]) : [];
  if (exercisesRaw.length === 0) badRequest("Field 'exercises' must contain at least one exercise.");
  if (exercisesRaw.length > MAX_WORKOUT_EXERCISES) badRequest(`Field 'exercises' must contain at most ${MAX_WORKOUT_EXERCISES} entries.`);
  const exercises = exercisesRaw.map((e, i) => validateLoggedExercise(e, i));

  // Auto-derive musclesWorked from the logged exercises when the caller
  // (very often a Custom GPT) doesn't supply it explicitly.
  const derivedMuscles = Array.from(new Set(exercises.flatMap((e) => e.muscles)));
  const musclesWorked = b.musclesWorked !== undefined ? asMuscleArray(b.musclesWorked, "musclesWorked") : derivedMuscles;

  return {
    date: asDate(b.date, "date", false),
    workoutType: asEnum(b.workoutType, "workoutType", WORKOUT_TYPES, true)!,
    musclesWorked,
    exercises,
    intensity: (asEnum(b.intensity, "intensity", ["light", "moderate", "heavy"] as const, false) ?? null) as WorkoutEntryInput["intensity"],
    notes: asTrimmedString(b.notes, "notes", 2000, false) ?? null,
    recoveryStatus: (asEnum(b.recoveryStatus, "recoveryStatus", ["fresh", "normal", "fatigued", "sore"] as const, false) ?? null) as WorkoutEntryInput["recoveryStatus"],
    painDuringWorkout: asTrimmedString(b.painDuringWorkout, "painDuringWorkout", 500, false) ?? null,
    exercisesMissed: asStringArray(b.exercisesMissed, "exercisesMissed", 40, 150),
  };
}

export function validateWorkoutPatch(body: unknown): Partial<WorkoutEntryInput> {
  const b = requireObject(body, "Workout patch");
  const patch: Partial<WorkoutEntryInput> = {};
  if (b.date !== undefined) patch.date = asDate(b.date, "date", true);
  if (b.workoutType !== undefined) patch.workoutType = asEnum(b.workoutType, "workoutType", WORKOUT_TYPES, true);
  if (b.musclesWorked !== undefined) patch.musclesWorked = asMuscleArray(b.musclesWorked, "musclesWorked");
  if (b.exercises !== undefined) {
    const exercisesRaw = Array.isArray(b.exercises) ? (b.exercises as unknown[]) : badRequest("Field 'exercises' must be an array.");
    patch.exercises = exercisesRaw.map((e, i) => validateLoggedExercise(e, i));
  }
  if (b.intensity !== undefined) patch.intensity = (asEnum(b.intensity, "intensity", ["light", "moderate", "heavy"] as const, false) ?? null) as WorkoutEntryInput["intensity"];
  if (b.notes !== undefined) patch.notes = asTrimmedString(b.notes, "notes", 2000, false) ?? null;
  if (b.recoveryStatus !== undefined) patch.recoveryStatus = (asEnum(b.recoveryStatus, "recoveryStatus", ["fresh", "normal", "fatigued", "sore"] as const, false) ?? null) as WorkoutEntryInput["recoveryStatus"];
  if (b.painDuringWorkout !== undefined) patch.painDuringWorkout = asTrimmedString(b.painDuringWorkout, "painDuringWorkout", 500, false) ?? null;
  if (b.exercisesMissed !== undefined) patch.exercisesMissed = asStringArray(b.exercisesMissed, "exercisesMissed", 40, 150);
  if (Object.keys(patch).length === 0) badRequest("Patch body must include at least one recognized workout field.");
  return patch;
}

/* ─── Notes ─── */

const MAX_NOTE_LENGTH = 50_000;

export function validateNoteContent(body: unknown): string {
  const b = requireObject(body, "Note");
  if (b.content !== undefined && typeof b.content !== "string") {
    badRequest("Field 'content' must be a string.");
  }
  const content = (b.content as string) || "";
  if (content.length > MAX_NOTE_LENGTH) {
    badRequest(`Field 'content' must be at most ${MAX_NOTE_LENGTH} characters.`);
  }
  return content;
}

/* ─── Settings ─── */

export function validateSettingsPatch(body: unknown): Partial<Omit<DashboardSettings, "updatedAt">> {
  const b = requireObject(body, "Settings patch");
  const patch: Partial<Omit<DashboardSettings, "updatedAt">> = {};
  if (b.weightUnit !== undefined) patch.weightUnit = asEnum(b.weightUnit, "weightUnit", WEIGHT_UNITS, true)!;
  if (b.distanceUnit !== undefined) patch.distanceUnit = asEnum(b.distanceUnit, "distanceUnit", DISTANCE_UNITS, true)!;
  if (Object.keys(patch).length === 0) badRequest("Patch body must include at least one of: weightUnit, distanceUnit.");
  return patch;
}

export { randomUUID };
