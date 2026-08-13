"use client";

import React, { useEffect, useState } from "react";
import type { WorkoutEntry, WorkoutType, MuscleGroup } from "@/types";
import type { TabProps } from "./tabTypes";
import { toLocalDateStr } from "@/lib/dates";
import { MUSCLE_GROUPS } from "@/lib/coach";
import { Plus, Trash2 } from "lucide-react";

const WORKOUT_TYPES: WorkoutType[] = ["push", "pull", "legs", "upper_body", "lower_body", "full_body", "cardio", "mobility", "football", "rehab", "recovery", "other"];

interface DraftSet { reps: string; weight: string; unit: "kg" | "lb" }
interface DraftExercise { name: string; muscles: MuscleGroup[]; sets: DraftSet[]; notes: string }

function emptyExercise(): DraftExercise {
  return { name: "", muscles: [], sets: [{ reps: "", weight: "", unit: "kg" }], notes: "" };
}

function label(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const WorkoutLogTab: React.FC<TabProps> = ({ getHeaders, triggerAlert, triggerConfirm }) => {
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(toLocalDateStr(new Date()));
  const [workoutType, setWorkoutType] = useState<WorkoutType>("push");
  const [exercises, setExercises] = useState<DraftExercise[]>([emptyExercise()]);
  const [notes, setNotes] = useState("");
  const [pain, setPain] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState("");

  const fetchWorkouts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workouts?limit=50", { headers: getHeaders() });
      if (res.ok) setWorkouts(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateExercise = (i: number, patch: Partial<DraftExercise>) => {
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  };

  const updateSet = (exIdx: number, setIdx: number, patch: Partial<DraftSet>) => {
    setExercises((prev) =>
      prev.map((e, idx) => (idx === exIdx ? { ...e, sets: e.sets.map((s, sIdx) => (sIdx === setIdx ? { ...s, ...patch } : s)) } : e))
    );
  };

  const submitWorkout = async () => {
    const validExercises = exercises.filter((e) => e.name.trim());
    if (validExercises.length === 0) {
      triggerAlert("Missing exercises", "Add at least one exercise before saving.", "info");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          date,
          workoutType,
          exercises: validExercises.map((e) => ({
            name: e.name.trim(),
            muscles: e.muscles,
            sets: e.sets.filter((s) => s.reps || s.weight).map((s) => ({ reps: s.reps ? Number(s.reps) : null, weight: s.weight ? Number(s.weight) : null, unit: s.unit })),
            notes: e.notes.trim() || null,
          })),
          notes: notes.trim() || null,
          painDuringWorkout: pain.trim() || null,
          recoveryStatus: recoveryStatus || null,
        }),
      });
      if (res.ok) {
        setExercises([emptyExercise()]);
        setNotes("");
        setPain("");
        setRecoveryStatus("");
        await fetchWorkouts();
        triggerAlert("Workout Logged", "Nice work — synced to your training journal.", "success");
      } else {
        const err = await res.json();
        triggerAlert("Couldn't save", err.message || "Please check the form and try again.", "danger");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkout = (id: string) => {
    triggerConfirm("Delete Workout", "Remove this session from your training journal?", async () => {
      const res = await fetch(`/api/workouts/${id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) setWorkouts((prev) => prev.filter((w) => w.id !== id));
    });
  };

  const card = "rounded-card border border-border-subtle bg-bg-card p-5 shadow-subtle";

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] pb-10">
      <h1 className="text-2xl font-bold tracking-[-0.5px]">Workout Log</h1>

      {/* Log new session */}
      <div className={card}>
        <h2 className="mb-4 font-serif text-base font-bold">Log a Session</h2>
        <div className="mb-4 flex gap-3 max-md:flex-col">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Workout Type</label>
            <select value={workoutType} onChange={(e) => setWorkoutType(e.target.value as WorkoutType)} className="w-full">
              {WORKOUT_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Recovery Status</label>
            <select value={recoveryStatus} onChange={(e) => setRecoveryStatus(e.target.value)} className="w-full">
              <option value="">—</option>
              <option value="fresh">Fresh</option>
              <option value="normal">Normal</option>
              <option value="fatigued">Fatigued</option>
              <option value="sore">Sore</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {exercises.map((ex, i) => (
            <div key={i} className="rounded-lg border border-border-subtle bg-bg-primary/20 p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <input
                  placeholder="Exercise name (e.g. Barbell Bench Press)"
                  value={ex.name}
                  onChange={(e) => updateExercise(i, { name: e.target.value })}
                  className="flex-1"
                />
                {exercises.length > 1 && (
                  <button onClick={() => setExercises((prev) => prev.filter((_, idx) => idx !== i))} className="rounded p-1.5 text-text-muted hover:bg-white hover:text-[#b3666b]">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="mb-2 flex flex-wrap gap-1.5">
                {MUSCLE_GROUPS.map((m) => {
                  const active = ex.muscles.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateExercise(i, { muscles: active ? ex.muscles.filter((x) => x !== m) : [...ex.muscles, m] })}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all ${
                        active ? "border-text-primary bg-text-primary text-white" : "border-border-subtle bg-white text-text-secondary hover:border-border-hover"
                      }`}
                    >
                      {label(m)}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-1.5">
                {ex.sets.map((s, si) => (
                  <div key={si} className="flex items-center gap-2">
                    <span className="w-10 text-[10.5px] text-text-muted">Set {si + 1}</span>
                    <input type="number" placeholder="Reps" value={s.reps} onChange={(e) => updateSet(i, si, { reps: e.target.value })} className="w-20" />
                    <input type="number" placeholder="Weight" value={s.weight} onChange={(e) => updateSet(i, si, { weight: e.target.value })} className="w-24" />
                    <select value={s.unit} onChange={(e) => updateSet(i, si, { unit: e.target.value as "kg" | "lb" })} className="w-16">
                      <option value="kg">kg</option>
                      <option value="lb">lb</option>
                    </select>
                    {ex.sets.length > 1 && (
                      <button onClick={() => updateExercise(i, { sets: ex.sets.filter((_, idx) => idx !== si) })} className="text-text-muted hover:text-[#b3666b]">×</button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => updateExercise(i, { sets: [...ex.sets, { reps: "", weight: "", unit: "kg" }] })}
                  className="mt-1 flex w-fit items-center gap-1 rounded border border-dashed border-border-subtle bg-transparent px-2 py-1 text-[10.5px] font-medium text-text-secondary hover:bg-white"
                >
                  <Plus className="h-3 w-3" /> Add Set
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setExercises((prev) => [...prev, emptyExercise()])}
            className="flex w-fit items-center gap-1.5 rounded-md border border-border-subtle bg-white px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Add Exercise
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 max-md:grid-cols-1">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Pain During Workout (optional)</label>
            <input value={pain} onChange={(e) => setPain(e.target.value)} placeholder="e.g. sharp twinge in left shoulder on the last set" className="w-full" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How the session felt overall" className="w-full" />
          </div>
        </div>

        <button disabled={saving} onClick={submitWorkout} className="mt-4 rounded-md border border-text-primary bg-text-primary px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2e2d27] disabled:opacity-50">
          {saving ? "Saving…" : "Save Workout"}
        </button>
      </div>

      {/* History */}
      <div>
        <h2 className="mb-3 font-serif text-base font-bold">History</h2>
        {loading ? (
          <p className="text-xs text-text-secondary">Loading…</p>
        ) : workouts.length === 0 ? (
          <p className="text-xs italic text-text-muted">No workouts logged yet — add your first session above.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {workouts.map((w) => (
              <div key={w.id} className={card}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold">{w.date}</span>
                      <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-semibold text-text-secondary">{label(w.workoutType)}</span>
                      {w.painDuringWorkout && <span className="rounded-full bg-[#b3666b1a] px-2 py-0.5 text-[10px] font-semibold text-[#b3666b]">⚠ Pain flagged</span>}
                    </div>
                    <p className="mt-1.5 text-[12px] text-text-secondary">
                      {w.exercises.map((e) => e.name).join(", ")}
                      {w.estimatedVolume ? ` · Volume: ${w.estimatedVolume.toLocaleString()}` : ""}
                    </p>
                    {w.notes && <p className="mt-1 text-[11.5px] italic text-text-muted">&ldquo;{w.notes}&rdquo;</p>}
                  </div>
                  <button onClick={() => deleteWorkout(w.id)} className="shrink-0 rounded p-1.5 text-text-muted hover:bg-bg-primary hover:text-[#b3666b]">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
