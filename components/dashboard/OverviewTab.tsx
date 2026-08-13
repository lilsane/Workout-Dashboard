"use client";

import React, { useEffect, useState } from "react";
import type { TabProps } from "./tabTypes";
import type { HealthProfile, WorkoutEntry } from "@/types";
import { AlertTriangle, Flame, HeartPulse } from "lucide-react";

interface OverviewTabProps extends TabProps {
  setActiveTab: (tab: string) => void;
}

function label(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ getHeaders, setActiveTab }) => {
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutEntry[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const headers = getHeaders();
        const [profileRes, workoutsRes, recRes, weekRes] = await Promise.all([
          fetch("/api/health-profile", { headers }),
          fetch("/api/workouts?limit=5", { headers }),
          fetch("/api/coach/recommend", { headers }),
          fetch("/api/coach/weekly", { headers }),
        ]);
        if (profileRes.ok) setProfile(await profileRes.json());
        if (workoutsRes.ok) setRecentWorkouts(await workoutsRes.json());
        if (recRes.ok) setRecommendation(await recRes.json());
        if (weekRes.ok) setAnalysis(await weekRes.json());
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = "rounded-card border border-border-subtle bg-bg-card p-5 shadow-subtle";
  const activeConditions = profile?.conditions.filter((c) => !c.resolved) || [];

  if (loading) {
    return <div className="animate-[fadeIn_0.4s_ease_forwards] text-sm text-text-secondary">Loading your dashboard…</div>;
  }

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] pb-10">
      <h1 className="text-2xl font-bold tracking-[-0.5px]">Overview</h1>

      {recommendation && (
        <div className={`${card} border-l-4 border-l-text-primary cursor-pointer`} onClick={() => setActiveTab("coach")}>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-4 w-4 text-text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Recommended Today</span>
          </div>
          <h2 className="mb-2 font-serif text-xl font-bold">{label(recommendation.suggestion)}</h2>
          <p className="text-[13px] leading-relaxed text-text-secondary">{recommendation.reason}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <div className={card}>
          <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-text-secondary">Sessions This Week</span>
          <span className="mt-1 block text-2xl font-bold">{analysis?.sessionsCount ?? 0}</span>
        </div>
        <div className={card}>
          <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-text-secondary">Active Conditions</span>
          <span className="mt-1 block text-2xl font-bold">{activeConditions.length}</span>
        </div>
        <div className={card}>
          <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-text-secondary">Current BMI</span>
          <span className="mt-1 block text-2xl font-bold">{profile?.bmi ?? "—"}</span>
        </div>
      </div>

      {activeConditions.length > 0 && (
        <div className={`${card} border-l-4 border-l-[#b3666b]`}>
          <h2 className="mb-3 flex items-center gap-1.5 font-serif text-base font-bold">
            <HeartPulse className="h-4 w-4 text-[#b3666b]" /> Active Conditions Guiding Your Program
          </h2>
          <div className="flex flex-wrap gap-2">
            {activeConditions.map((c) => (
              <span key={c.id} className="rounded-full bg-[#b3666b1a] px-3 py-1 text-[11.5px] font-medium text-[#b3666b]">{c.description}</span>
            ))}
          </div>
        </div>
      )}

      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-base font-bold">Recent Sessions</h2>
          <button onClick={() => setActiveTab("workouts")} className="text-[11.5px] font-semibold text-text-secondary hover:text-text-primary">View all →</button>
        </div>
        {recentWorkouts.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-xs italic text-text-muted">No workouts yet. Log your first session to get started.</p>
            <button onClick={() => setActiveTab("workouts")} className="rounded-md border border-text-primary bg-text-primary px-4 py-2 text-xs font-semibold text-white hover:bg-[#2e2d27]">
              Log a Workout
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentWorkouts.map((w) => (
              <div key={w.id} className="flex items-center justify-between border-b border-bg-primary pb-2 last:border-0">
                <div>
                  <span className="text-[12.5px] font-semibold">{w.date}</span>
                  <span className="ml-2 rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">{label(w.workoutType)}</span>
                </div>
                {w.painDuringWorkout && <span className="flex items-center gap-1 text-[10.5px] font-medium text-[#b3666b]"><AlertTriangle className="h-3 w-3" /> Pain noted</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
