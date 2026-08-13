"use client";

import React, { useEffect, useState } from "react";
import type { HealthProfile } from "@/types";
import type { TabProps } from "./tabTypes";
import { toLocalDateStr } from "@/lib/dates";

const GOALS = ["muscle_gain", "fat_loss", "strength", "athletic_performance", "rehabilitation", "combination"];
const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"];
const RECOVERY_SPEEDS = ["slow", "average", "fast"];

function label(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-card p-2">
      {values.map((v, i) => (
        <span key={i} className="flex items-center gap-1 rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-primary">
          {v}
          <button type="button" onClick={() => onChange(values.filter((_, idx) => idx !== i))} className="text-text-muted hover:text-text-primary">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === ",") && input.trim()) {
            e.preventDefault();
            onChange([...values, input.trim()]);
            setInput("");
          } else if (e.key === "Backspace" && !input && values.length > 0) {
            onChange(values.slice(0, -1));
          }
        }}
        placeholder={placeholder}
        className="flex-1 min-w-[120px] border-none bg-transparent p-1 text-[12.5px] outline-none"
      />
    </div>
  );
}

export const HealthProfileTab: React.FC<TabProps> = ({ getHeaders, triggerAlert, triggerConfirm }) => {
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [conditionInput, setConditionInput] = useState("");
  const [measureForm, setMeasureForm] = useState<Record<string, string>>({});
  const [savingMeasurement, setSavingMeasurement] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health-profile", { headers: getHeaders() });
      if (res.ok) setProfile(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = async (fields: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/health-profile", { method: "PATCH", headers: getHeaders(), body: JSON.stringify(fields) });
      if (res.ok) setProfile(await res.json());
      else triggerAlert("Update failed", "Could not save that change. Please try again.", "danger");
    } finally {
      setSaving(false);
    }
  };

  const addCondition = async () => {
    if (!conditionInput.trim()) return;
    const res = await fetch("/api/health-profile/conditions", { method: "POST", headers: getHeaders(), body: JSON.stringify({ description: conditionInput.trim() }) });
    if (res.ok) {
      const data = await res.json();
      setProfile((p) => (p ? { ...p, conditions: data.conditions } : p));
      setConditionInput("");
    }
  };

  const toggleResolved = async (id: string, resolved: boolean) => {
    const res = await fetch(`/api/health-profile/conditions/${id}`, { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ resolved }) });
    if (res.ok) {
      const data = await res.json();
      setProfile((p) => (p ? { ...p, conditions: data.conditions } : p));
    }
  };

  const deleteCondition = (id: string, desc: string) => {
    triggerConfirm("Remove Condition", `Permanently delete "${desc}"? Prefer marking it resolved instead, so the history is kept.`, async () => {
      const res = await fetch(`/api/health-profile/conditions/${id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProfile((p) => (p ? { ...p, conditions: data.conditions } : p));
      }
    });
  };

  const logMeasurement = async () => {
    setSavingMeasurement(true);
    try {
      const body: Record<string, unknown> = { date: toLocalDateStr(new Date()) };
      for (const [k, v] of Object.entries(measureForm)) {
        if (v.trim() !== "") body[k] = Number(v);
      }
      const res = await fetch("/api/health-profile/measurements", { method: "POST", headers: getHeaders(), body: JSON.stringify(body) });
      if (res.ok) {
        await fetchProfile();
        setMeasureForm({});
        triggerAlert("Logged", "Measurement snapshot saved.", "success");
      }
    } finally {
      setSavingMeasurement(false);
    }
  };

  if (loading || !profile) {
    return <div className="animate-[fadeIn_0.4s_ease_forwards] text-sm text-text-secondary">Loading health profile…</div>;
  }

  const inputCls = "w-full";
  const fieldWrap = "flex flex-col gap-1.5";
  const fieldLabel = "text-[11px] font-semibold uppercase tracking-wide text-text-secondary";
  const card = "rounded-card border border-border-subtle bg-bg-card p-5 shadow-subtle";

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-[-0.5px]">Health Profile</h1>
        <span className="text-xs text-text-muted">{saving ? "Saving…" : "Saved"}</span>
      </div>

      {/* Personal Details */}
      <div className={card}>
        <h2 className="mb-4 font-serif text-base font-bold">Personal Details</h2>
        <div className="grid grid-cols-3 gap-4 max-md:grid-cols-2">
          <div className={fieldWrap}>
            <label className={fieldLabel}>Age</label>
            <input type="number" className={inputCls} defaultValue={profile.ageYears ?? ""} onBlur={(e) => patch({ ageYears: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className={fieldWrap}>
            <label className={fieldLabel}>Height (cm)</label>
            <input type="number" className={inputCls} defaultValue={profile.heightCm ?? ""} onBlur={(e) => patch({ heightCm: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className={fieldWrap}>
            <label className={fieldLabel}>Weight (kg)</label>
            <input type="number" className={inputCls} defaultValue={profile.weightKg ?? ""} onBlur={(e) => patch({ weightKg: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className={fieldWrap}>
            <label className={fieldLabel}>Sex</label>
            <select className={inputCls} defaultValue={profile.sex ?? ""} onChange={(e) => patch({ sex: e.target.value || null })}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className={fieldWrap}>
            <label className={fieldLabel}>Dominant Hand</label>
            <select className={inputCls} defaultValue={profile.dominantHand ?? ""} onChange={(e) => patch({ dominantHand: e.target.value || null })}>
              <option value="">—</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="ambidextrous">Ambidextrous</option>
            </select>
          </div>
          <div className={fieldWrap}>
            <label className={fieldLabel}>Goal</label>
            <select className={inputCls} defaultValue={profile.goal ?? ""} onChange={(e) => patch({ goal: e.target.value || null })}>
              <option value="">—</option>
              {GOALS.map((g) => <option key={g} value={g}>{label(g)}</option>)}
            </select>
          </div>
        </div>
        {profile.bmi != null && (
          <p className="mt-4 text-xs text-text-secondary">
            Current BMI: <strong className="text-text-primary">{profile.bmi}</strong> (calculated automatically from height + weight)
          </p>
        )}
      </div>

      {/* Health Conditions */}
      <div className={card}>
        <h2 className="mb-1 font-serif text-base font-bold">Health Conditions</h2>
        <p className="mb-4 text-xs text-text-secondary">Permanent records — spinal issues, joint problems, past injuries. These are never forgotten and are always factored into recommendations, unless you mark them resolved.</p>
        <div className="mb-4 flex gap-2">
          <input
            value={conditionInput}
            onChange={(e) => setConditionInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCondition()}
            placeholder="e.g. C4-C5 cervical disc herniation"
            className="flex-1"
          />
          <button onClick={addCondition} className="rounded-md border border-text-primary bg-text-primary px-4 py-2 text-xs font-semibold text-white hover:bg-[#2e2d27]">Add</button>
        </div>
        {profile.conditions.length === 0 ? (
          <p className="text-xs italic text-text-muted">No conditions on file yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {profile.conditions.map((c) => (
              <div key={c.id} className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${c.resolved ? "border-border-subtle bg-bg-primary/30 opacity-60" : "border-[#b3666b30] bg-[#b3666b08]"}`}>
                <div className="min-w-0">
                  <p className={`text-[13px] font-semibold ${c.resolved ? "line-through text-text-secondary" : "text-text-primary"}`}>{c.description}</p>
                  {c.notes && <p className="mt-0.5 text-[11px] text-text-secondary">{c.notes}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => toggleResolved(c.id, !c.resolved)} className="rounded border border-border-subtle bg-white px-2.5 py-1 text-[10.5px] font-semibold text-text-primary hover:bg-bg-primary">
                    {c.resolved ? "Reopen" : "Mark Resolved"}
                  </button>
                  <button onClick={() => deleteCondition(c.id, c.description)} className="rounded border border-border-subtle bg-white px-2.5 py-1 text-[10.5px] font-semibold text-[#b3666b] hover:bg-[#b3666b10]">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body Measurements */}
      <div className={card}>
        <h2 className="mb-4 font-serif text-base font-bold">Body Measurements</h2>
        <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
          {[
            ["weightKg", "Weight (kg)"], ["neckCm", "Neck (cm)"], ["chestCm", "Chest (cm)"], ["waistCm", "Waist (cm)"],
            ["hipCm", "Hip (cm)"], ["shoulderWidthCm", "Shoulders (cm)"], ["upperArmCm", "Upper Arm (cm)"], ["forearmCm", "Forearm (cm)"],
            ["thighCm", "Thigh (cm)"], ["calfCm", "Calf (cm)"], ["wristCm", "Wrist (cm)"], ["bodyFatPercent", "Body Fat %"],
          ].map(([key, lbl]) => (
            <div key={key} className={fieldWrap}>
              <label className={fieldLabel}>{lbl}</label>
              <input type="number" step="0.1" value={measureForm[key] || ""} onChange={(e) => setMeasureForm((f) => ({ ...f, [key]: e.target.value }))} className={inputCls} />
            </div>
          ))}
        </div>
        <button disabled={savingMeasurement} onClick={logMeasurement} className="mt-4 rounded-md border border-text-primary bg-text-primary px-4 py-2 text-xs font-semibold text-white hover:bg-[#2e2d27] disabled:opacity-50">
          {savingMeasurement ? "Saving…" : "Log Today's Measurements"}
        </button>

        {profile.measurementHistory.length > 0 && (
          <div className="mt-5 max-h-56 overflow-y-auto border-t border-border-subtle pt-3">
            {profile.measurementHistory.slice(0, 15).map((m) => (
              <div key={m.date} className="flex items-center justify-between border-b border-bg-primary py-1.5 text-[11.5px]">
                <span className="text-text-secondary">{m.date}</span>
                <span className="font-mono text-text-primary">
                  {m.weightKg ? `${m.weightKg}kg` : ""} {m.waistCm ? `· waist ${m.waistCm}cm` : ""} {m.bmi ? `· BMI ${m.bmi}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fitness Info */}
      <div className={card}>
        <h2 className="mb-4 font-serif text-base font-bold">Fitness Background</h2>
        <div className="grid grid-cols-3 gap-4 max-md:grid-cols-2 mb-4">
          <div className={fieldWrap}>
            <label className={fieldLabel}>Experience Level</label>
            <select className={inputCls} defaultValue={profile.experienceLevel ?? ""} onChange={(e) => patch({ experienceLevel: e.target.value || null })}>
              <option value="">—</option>
              {EXPERIENCE_LEVELS.map((v) => <option key={v} value={v}>{label(v)}</option>)}
            </select>
          </div>
          <div className={fieldWrap}>
            <label className={fieldLabel}>Recovery Speed</label>
            <select className={inputCls} defaultValue={profile.recoverySpeed ?? ""} onChange={(e) => patch({ recoverySpeed: e.target.value || null })}>
              <option value="">—</option>
              {RECOVERY_SPEEDS.map((v) => <option key={v} value={v}>{label(v)}</option>)}
            </select>
          </div>
          <div className={fieldWrap}>
            <label className={fieldLabel}>Football Sessions / Week</label>
            <input type="number" className={inputCls} defaultValue={profile.footballFrequencyPerWeek ?? ""} onBlur={(e) => patch({ footballFrequencyPerWeek: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className={fieldWrap}>
            <label className={fieldLabel}>Daily Steps</label>
            <input type="number" className={inputCls} defaultValue={profile.dailySteps ?? ""} onBlur={(e) => patch({ dailySteps: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className={fieldWrap}>
            <label className={fieldLabel}>Protein Intake (g/day)</label>
            <input type="number" className={inputCls} defaultValue={profile.proteinIntakeG ?? ""} onBlur={(e) => patch({ proteinIntakeG: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className={fieldWrap}>
            <label className={fieldLabel}>Water Intake (L/day)</label>
            <input type="number" step="0.1" className={inputCls} defaultValue={profile.waterIntakeL ?? ""} onBlur={(e) => patch({ waterIntakeL: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className={fieldWrap}>
            <label className={fieldLabel}>Sleep Hours / Night</label>
            <input type="number" step="0.5" className={inputCls} defaultValue={profile.sleepHours ?? ""} onBlur={(e) => patch({ sleepHours: e.target.value ? Number(e.target.value) : null })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <div className={fieldWrap}>
            <label className={fieldLabel}>Favorite Exercises</label>
            <TagInput values={profile.favoriteExercises} onChange={(v) => patch({ favoriteExercises: v })} placeholder="Add & press Enter" />
          </div>
          <div className={fieldWrap}>
            <label className={fieldLabel}>Disliked Exercises</label>
            <TagInput values={profile.dislikedExercises} onChange={(v) => patch({ dislikedExercises: v })} placeholder="Add & press Enter" />
          </div>
          <div className={fieldWrap}>
            <label className={fieldLabel}>Mobility Limitations</label>
            <TagInput values={profile.mobilityLimitations} onChange={(v) => patch({ mobilityLimitations: v })} placeholder="Add & press Enter" />
          </div>
          <div className={fieldWrap}>
            <label className={fieldLabel}>Sports Played</label>
            <TagInput values={profile.sportsPlayed} onChange={(v) => patch({ sportsPlayed: v })} placeholder="Add & press Enter" />
          </div>
        </div>
      </div>
    </div>
  );
};
