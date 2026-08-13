// Pure analysis functions for the "Coach Intelligence" layer: weekly
// training-balance analysis, next-workout recommendations, and a keyword
// based safety-caution engine driven by whatever the user's health profile
// says. No I/O here — callers (API routes, the Gemini function-calling
// assistant) fetch workouts/health profile and pass them in.
import type { HealthProfile, MuscleGroup, WorkoutEntry, WorkoutType } from "@/types";
import { daysBetween, toLocalDateStr } from "./dates";

export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  "chest", "back", "shoulders", "front_delts", "side_delts", "rear_delts",
  "biceps", "triceps", "forearms", "core", "lower_back",
  "glutes", "quads", "hamstrings", "calves", "neck", "cardio",
];

const PUSH_MUSCLES: MuscleGroup[] = ["chest", "shoulders", "front_delts", "side_delts", "triceps"];
const PULL_MUSCLES: MuscleGroup[] = ["back", "rear_delts", "biceps", "forearms"];
const UPPER_MUSCLES: MuscleGroup[] = [...PUSH_MUSCLES, ...PULL_MUSCLES, "neck"];
const LOWER_MUSCLES: MuscleGroup[] = ["glutes", "quads", "hamstrings", "calves"];

export interface WeeklyAnalysis {
  windowDays: number;
  sessionsCount: number;
  skippedDays: number;
  muscleFrequency: Partial<Record<MuscleGroup, number>>;
  neglectedMuscles: MuscleGroup[];
  overtrainedMuscles: MuscleGroup[];
  pushSessions: number;
  pullSessions: number;
  upperSessions: number;
  lowerSessions: number;
  lastTrainedByMuscle: Partial<Record<MuscleGroup, string>>;
  cardioSessions: number;
  footballSessions: number;
  painFlags: { date: string; description: string }[];
}

export function weeklyAnalysis(workouts: WorkoutEntry[], windowDays = 7, today: string = toLocalDateStr(new Date())): WeeklyAnalysis {
  const inWindow = workouts.filter((w) => daysBetween(w.date, today) < windowDays && daysBetween(w.date, today) >= 0);

  const muscleFrequency: Partial<Record<MuscleGroup, number>> = {};
  const lastTrainedByMuscle: Partial<Record<MuscleGroup, string>> = {};
  let pushSessions = 0, pullSessions = 0, upperSessions = 0, lowerSessions = 0, cardioSessions = 0, footballSessions = 0;
  const painFlags: { date: string; description: string }[] = [];

  for (const w of workouts) {
    for (const m of w.musclesWorked) {
      if (!lastTrainedByMuscle[m] || w.date > lastTrainedByMuscle[m]!) lastTrainedByMuscle[m] = w.date;
    }
    if (w.painDuringWorkout) painFlags.push({ date: w.date, description: w.painDuringWorkout });
  }

  for (const w of inWindow) {
    for (const m of w.musclesWorked) muscleFrequency[m] = (muscleFrequency[m] || 0) + 1;
    if (w.musclesWorked.some((m) => PUSH_MUSCLES.includes(m))) pushSessions++;
    if (w.musclesWorked.some((m) => PULL_MUSCLES.includes(m))) pullSessions++;
    if (w.musclesWorked.some((m) => UPPER_MUSCLES.includes(m))) upperSessions++;
    if (w.musclesWorked.some((m) => LOWER_MUSCLES.includes(m))) lowerSessions++;
    if (w.workoutType === "cardio") cardioSessions++;
    if (w.workoutType === "football") footballSessions++;
  }

  const neglectedMuscles = MUSCLE_GROUPS.filter((m) => m !== "cardio" && m !== "neck" && (muscleFrequency[m] || 0) === 0);
  const overtrainedMuscles = MUSCLE_GROUPS.filter((m) => (muscleFrequency[m] || 0) >= 4);

  const sessionDates = new Set(inWindow.map((w) => w.date));
  const skippedDays = Math.max(0, windowDays - sessionDates.size);

  return {
    windowDays,
    sessionsCount: inWindow.length,
    skippedDays,
    muscleFrequency,
    neglectedMuscles,
    overtrainedMuscles,
    pushSessions,
    pullSessions,
    upperSessions,
    lowerSessions,
    lastTrainedByMuscle,
    cardioSessions,
    footballSessions,
    painFlags: painFlags.slice(0, 10),
  };
}

/* ─── Condition-driven safety cautions ───
 * Generic keyword scan over whatever text is actually in the user's health
 * profile — not hardcoded to any one person's conditions, so it keeps working
 * as conditions are added, resolved, or changed over time.
 *
 * Resolved conditions are NOT forgotten. They produce a "historical" caution
 * so the AI can acknowledge past incidents and advise extra care, without
 * treating the exercise as outright unsafe. Active cautions always win the
 * dedup when the same rule fires for both an active and a resolved condition. */
const CAUTION_RULES: { keywords: string[]; caution: string }[] = [
  { keywords: ["cervical", "neck", "c4", "c5", "c6", "c7"], caution: "Avoid heavy overhead pressing, shrugs, and any loaded neck flexion/extension. Keep the neck neutral; prefer machines over free-standing barbell overhead work." },
  { keywords: ["lumbar", "l4", "l5", "s1", "disc", "lower back", "low back"], caution: "Avoid loaded spinal flexion (good mornings, deadlifts from the floor, sit-ups) and heavy axial loading (back squats, overhead press without back support). Prefer machines, belt squats, or supported variations." },
  { keywords: ["shoulder"], caution: "Avoid deep behind-the-neck presses and unsupported heavy overhead lockouts. Watch for impingement signs during pressing movements." },
  { keywords: ["levator scapulae", "trap"], caution: "Avoid heavy shrugs and sustained neck-side-bend stretches under load." },
  { keywords: ["knee"], caution: "Avoid deep unsupported loaded knee flexion (full ROM leg press, deep lunges) until cleared; prefer controlled ROM." },
  { keywords: ["wrist"], caution: "Prefer neutral-grip or strap-supported pressing/pulling over full wrist-extension positions (e.g. front rack, push-ups on flat palms)." },
  { keywords: ["hip"], caution: "Avoid deep unsupported loaded hip flexion under heavy axial load; monitor for pinching in deep squat positions." },
];

export interface ActiveCaution    { type: "active";     condition: string; caution: string; }
export interface HistoricalCaution { type: "historical"; condition: string; caution: string; }
export type ConditionCaution = ActiveCaution | HistoricalCaution;

export function cautionsForProfile(profile: HealthProfile): ConditionCaution[] {
  // Key on `type::caution` so a rule never fires twice for the same caution text,
  // and an active entry always replaces a historical one (not the other way around).
  const seen = new Map<string, ConditionCaution>();
  for (const condition of profile.conditions) {
    const text = condition.description.toLowerCase();
    for (const rule of CAUTION_RULES) {
      if (rule.keywords.some((k) => text.includes(k))) {
        const type = condition.resolved ? "historical" : "active";
        const key = `${type}::${rule.caution}`;
        if (!seen.has(key) || seen.get(key)!.type === "historical") {
          seen.set(key, { type, condition: condition.description, caution: rule.caution });
        }
      }
    }
  }
  return Array.from(seen.values());
}

/* ─── Next-workout recommendation ───
 * "Never recommend consecutive heavy sessions for the same muscle." Looks at
 * what was trained recently, how long recovery has had, and whether the last
 * session flagged pain, to suggest what today/tomorrow should be. */
export interface WorkoutRecommendation {
  suggestion: WorkoutType | "rest";
  reason: string;
  freshMuscles: MuscleGroup[];
  fatiguedMuscles: MuscleGroup[];
  cautions: ConditionCaution[];
}

const RECOVERY_DAYS: Record<string, number> = { slow: 3, average: 2, fast: 1 };

export function recommendNextWorkout(
  workouts: WorkoutEntry[],
  profile: HealthProfile,
  today: string = toLocalDateStr(new Date())
): WorkoutRecommendation {
  const cautions = cautionsForProfile(profile);
  const minRestDays = RECOVERY_DAYS[profile.recoverySpeed || "average"] || 2;

  const analysis = weeklyAnalysis(workouts, 14, today);
  const fatiguedMuscles = (Object.keys(analysis.lastTrainedByMuscle) as MuscleGroup[]).filter(
    (m) => daysBetween(analysis.lastTrainedByMuscle[m]!, today) < minRestDays
  );
  const freshMuscles = MUSCLE_GROUPS.filter((m) => m !== "cardio" && !fatiguedMuscles.includes(m));

  // Most recent workout — if it flagged pain, default to recovery, not a
  // harder push. "If symptoms suggest possible injury, advise medical
  // evaluation instead of pushing through."
  const lastWorkout = workouts[0];
  if (lastWorkout && lastWorkout.date === today) {
    return { suggestion: "rest", reason: "You already trained today — recovery comes first.", freshMuscles, fatiguedMuscles, cautions };
  }
  if (lastWorkout?.painDuringWorkout && daysBetween(lastWorkout.date, today) <= 1) {
    return {
      suggestion: "recovery",
      reason: `You reported pain during your last session ("${lastWorkout.painDuringWorkout}"). Take a light recovery day and consider a medical evaluation if it persists.`,
      freshMuscles,
      fatiguedMuscles,
      cautions,
    };
  }

  const daysSinceLast = lastWorkout ? daysBetween(lastWorkout.date, today) : 99;
  if (daysSinceLast === 0) {
    return { suggestion: "rest", reason: "You already trained today.", freshMuscles, fatiguedMuscles, cautions };
  }

  const pushFresh = !fatiguedMuscles.some((m) => PUSH_MUSCLES.includes(m));
  const pullFresh = !fatiguedMuscles.some((m) => PULL_MUSCLES.includes(m));
  const legsFresh = !fatiguedMuscles.some((m) => LOWER_MUSCLES.includes(m));

  if (legsFresh && analysis.lowerSessions <= analysis.upperSessions) {
    return { suggestion: "legs", reason: "Lower body is fresh and under-trained relative to upper body this week.", freshMuscles, fatiguedMuscles, cautions };
  }
  if (pullFresh && analysis.pullSessions <= analysis.pushSessions) {
    return { suggestion: "pull", reason: "Pull muscles (back, biceps, rear delts) are fresh and behind push volume this week.", freshMuscles, fatiguedMuscles, cautions };
  }
  if (pushFresh) {
    return { suggestion: "push", reason: "Push muscles (chest, shoulders, triceps) are fresh.", freshMuscles, fatiguedMuscles, cautions };
  }
  if (daysSinceLast >= minRestDays + 2) {
    return { suggestion: "full_body", reason: "It's been a few days — a moderate full-body session will restart momentum without shaming the gap.", freshMuscles, fatiguedMuscles, cautions };
  }
  return { suggestion: "mobility", reason: "Most major muscle groups are still recovering — use today for mobility, light cardio, or football skill work.", freshMuscles, fatiguedMuscles, cautions };
}
