// Shared domain types for the dashboard — client-side mirrors of the API
// response/request shapes defined server-side in lib/firebase.ts.

export interface FirebaseUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  idToken: string;
}

export type Sex = "male" | "female" | "other";
export type Goal = "muscle_gain" | "fat_loss" | "strength" | "athletic_performance" | "rehabilitation" | "combination";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type RecoverySpeed = "slow" | "average" | "fast";

export interface BodyMeasurementSnapshot {
  date: string; // YYYY-MM-DD
  weightKg?: number | null;
  neckCm?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  shoulderWidthCm?: number | null;
  upperArmCm?: number | null;
  forearmCm?: number | null;
  thighCm?: number | null;
  calfCm?: number | null;
  wristCm?: number | null;
  bodyFatPercent?: number | null;
  bmi?: number | null;
}

export interface HealthCondition {
  id: string;
  description: string; // e.g. "C4-C5 cervical disc herniation"
  addedAt: number;
  resolved: boolean;
  notes?: string | null;
}

export interface HealthProfile {
  ageYears?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  sex?: Sex | null;
  dominantHand?: "left" | "right" | "ambidextrous" | null;
  goal?: Goal | null;
  bmi?: number | null;

  measurementHistory: BodyMeasurementSnapshot[];
  conditions: HealthCondition[];

  experienceLevel?: ExperienceLevel | null;
  favoriteExercises: string[];
  dislikedExercises: string[];
  mobilityLimitations: string[];
  recoverySpeed?: RecoverySpeed | null;
  sportsPlayed: string[];
  footballFrequencyPerWeek?: number | null;
  dailySteps?: number | null;
  proteinIntakeG?: number | null;
  waterIntakeL?: number | null;
  sleepHours?: number | null;

  updatedAt: number;
}

export type WorkoutType =
  | "push"
  | "pull"
  | "legs"
  | "upper_body"
  | "lower_body"
  | "full_body"
  | "cardio"
  | "mobility"
  | "football"
  | "rehab"
  | "recovery"
  | "other";

export type MuscleGroup =
  | "chest" | "back" | "shoulders" | "front_delts" | "side_delts" | "rear_delts"
  | "biceps" | "triceps" | "forearms" | "core" | "lower_back"
  | "glutes" | "quads" | "hamstrings" | "calves" | "neck" | "cardio";

export interface LoggedSet {
  reps: number | null;
  weight: number | null;
  unit: "kg" | "lb";
  rpe?: number | null; // rate of perceived exertion, 1-10
}

export interface LoggedExercise {
  name: string;
  muscles: MuscleGroup[];
  sets: LoggedSet[];
  notes?: string | null;
}

export interface WorkoutEntry {
  id: string;
  date: string; // YYYY-MM-DD
  workoutType: WorkoutType;
  musclesWorked: MuscleGroup[];
  exercises: LoggedExercise[];
  estimatedVolume: number | null; // sum(sets * reps * weight)
  intensity?: "light" | "moderate" | "heavy" | null;
  notes: string | null;
  recoveryStatus?: "fresh" | "normal" | "fatigued" | "sore" | null;
  painDuringWorkout: string | null;
  exercisesMissed: string[];
  createdAt: number;
}

export interface NoteRecord {
  content: string;
  updatedAt: number;
}

export interface DashboardSettings {
  weightUnit: "kg" | "lb";
  distanceUnit: "km" | "mi";
  isPro?: boolean;
  updatedAt: number;
}

export type ExerciseCategory =
  | "barbell" | "dumbbell" | "cable" | "machine" | "bodyweight" | "calisthenics"
  | "olympic_lift" | "strongman" | "resistance_band" | "physiotherapy" | "stretching"
  | "mobility" | "plyometric" | "crossfit" | "cardio";

export interface ExerciseInfo {
  id: string;
  name: string;
  aliases: string[];
  category: ExerciseCategory;
  equipment: string[];
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  stabilizers: MuscleGroup[];
  difficulty: "beginner" | "intermediate" | "advanced";
  formTips: string[];
  commonMistakes: string[];
  cautionFor: string[]; // free-text conditions this exercise commonly aggravates
  alternatives: string[]; // names of safer/easier substitute exercises
}
