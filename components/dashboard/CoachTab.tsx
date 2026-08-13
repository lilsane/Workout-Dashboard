"use client";

import React, { useEffect, useState } from "react";
import type { TabProps } from "./tabTypes";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

function label(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const CoachTab: React.FC<TabProps> = ({ getHeaders }) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [aRes, rRes] = await Promise.all([
        fetch(`/api/coach/weekly?days=${days}`, { headers: getHeaders() }),
        fetch("/api/coach/recommend", { headers: getHeaders() }),
      ]);
      if (aRes.ok) setAnalysis(await aRes.json());
      if (rRes.ok) setRecommendation(await rRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const card = "rounded-card border border-border-subtle bg-bg-card p-5 shadow-subtle";

  if (loading && !analysis) {
    return <div className="animate-[fadeIn_0.4s_ease_forwards] text-sm text-text-secondary">Analyzing your training…</div>;
  }

  const balanceBar = (a: number, b: number, labelA: string, labelB: string) => {
    const total = a + b || 1;
    return (
      <div>
        <div className="mb-1 flex justify-between text-[11px] font-semibold text-text-secondary">
          <span>{labelA} ({a})</span>
          <span>{labelB} ({b})</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-bg-secondary">
          <div className="bg-text-primary" style={{ width: `${(a / total) * 100}%` }} />
          <div className="bg-border-hover" style={{ width: `${(b / total) * 100}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-[-0.5px]">Coach Insights</h1>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-auto">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Recommendation */}
      {recommendation && (
        <div className={`${card} border-l-4 border-l-text-primary`}>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-secondary">Today&apos;s Recommendation</span>
          <h2 className="mb-2 font-serif text-xl font-bold">{label(recommendation.suggestion)}</h2>
          <p className="text-[13px] leading-relaxed text-text-secondary">{recommendation.reason}</p>
          {recommendation.cautions?.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5 rounded-lg bg-[#b3666b0d] border border-[#b3666b30] p-3">
              {recommendation.cautions.map((c: string, i: number) => (
                <p key={i} className="flex items-start gap-1.5 text-[11.5px] text-[#8a4f53]">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {c}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {analysis && (
        <>
          <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2">
            {[
              { label: "Sessions", val: analysis.sessionsCount },
              { label: "Skipped Days", val: analysis.skippedDays },
              { label: "Cardio Sessions", val: analysis.cardioSessions },
              { label: "Football Sessions", val: analysis.footballSessions },
            ].map((c) => (
              <div key={c.label} className={card}>
                <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-text-secondary">{c.label}</span>
                <span className="mt-1 block text-xl font-bold">{c.val}</span>
              </div>
            ))}
          </div>

          <div className={card}>
            <h2 className="mb-4 font-serif text-base font-bold">Training Balance</h2>
            <div className="flex flex-col gap-4">
              {balanceBar(analysis.pushSessions, analysis.pullSessions, "Push", "Pull")}
              {balanceBar(analysis.upperSessions, analysis.lowerSessions, "Upper Body", "Lower Body")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div className={card}>
              <h2 className="mb-3 flex items-center gap-1.5 font-serif text-base font-bold text-[#b3666b]"><TrendingDown className="h-4 w-4" /> Neglected Muscles</h2>
              {analysis.neglectedMuscles.length === 0 ? (
                <p className="text-xs italic text-text-muted">Nothing neglected — great balance!</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.neglectedMuscles.map((m: string) => (
                    <span key={m} className="rounded-full bg-[#b3666b1a] px-2.5 py-1 text-[11px] font-medium text-[#b3666b]">{label(m)}</span>
                  ))}
                </div>
              )}
            </div>
            <div className={card}>
              <h2 className="mb-3 flex items-center gap-1.5 font-serif text-base font-bold text-[#c98a2c]"><TrendingUp className="h-4 w-4" /> Possibly Overtrained</h2>
              {analysis.overtrainedMuscles.length === 0 ? (
                <p className="text-xs italic text-text-muted">Nothing overtrained this window.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.overtrainedMuscles.map((m: string) => (
                    <span key={m} className="rounded-full bg-[#c98a2c1a] px-2.5 py-1 text-[11px] font-medium text-[#c98a2c]">{label(m)}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {analysis.painFlags?.length > 0 && (
            <div className={`${card} border-l-4 border-l-[#b3666b]`}>
              <h2 className="mb-3 font-serif text-base font-bold text-[#b3666b]">Pain Flags</h2>
              <div className="flex flex-col gap-2">
                {analysis.painFlags.map((p: any, i: number) => (
                  <div key={i} className="text-[12px]">
                    <span className="font-mono text-text-muted">{p.date}</span> — <span className="text-text-secondary">{p.description}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] italic text-text-muted">If pain persists or worsens, consider a medical evaluation rather than pushing through.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
