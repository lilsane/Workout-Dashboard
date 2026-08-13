"use client";

import React, { useEffect, useRef, useState } from "react";
import type { TabProps } from "./tabTypes";
import { MUSCLE_GROUPS } from "@/lib/coach";
import { Camera, Search, ShieldAlert, ShieldCheck } from "lucide-react";

function label(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ExerciseResult {
  id: string;
  name: string;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  difficulty: string;
  formTips: string[];
  commonMistakes: string[];
  alternatives: string[];
  safety: { safe: boolean; reasons: string[] };
}

export const ExerciseLibraryTab: React.FC<TabProps> = ({ getHeaders, triggerAlert }) => {
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [identifyText, setIdentifyText] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const [identifyResult, setIdentifyResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const search = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (muscleFilter) params.set("muscle", muscleFilter);
      const res = await fetch(`/api/exercises?${params}`, { headers: getHeaders() });
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(search, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, muscleFilter]);

  const runIdentify = async (imageBase64?: string, mimeType?: string) => {
    if (!identifyText.trim() && !imageBase64) return;
    setIdentifying(true);
    setIdentifyResult(null);
    try {
      const res = await fetch("/api/exercises/identify", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ description: identifyText.trim() || undefined, imageBase64, imageMimeType: mimeType }),
      });
      const data = await res.json();
      if (res.ok) setIdentifyResult(data);
      else triggerAlert("Identification failed", data.message || "Could not identify that exercise.", "danger");
    } finally {
      setIdentifying(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      runIdentify(result, file.type);
    };
    reader.readAsDataURL(file);
  };

  const card = "rounded-card border border-border-subtle bg-bg-card p-5 shadow-subtle";

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] pb-10">
      <h1 className="text-2xl font-bold tracking-[-0.5px]">Exercise Library</h1>

      {/* Identify */}
      <div className={card}>
        <h2 className="mb-1 font-serif text-base font-bold">Identify an Exercise</h2>
        <p className="mb-4 text-xs text-text-secondary">Describe a machine, gym name, or partial description — or upload a photo — and the coach will identify it, with muscles worked, form cues, and a safety check against your conditions.</p>
        <div className="flex gap-2 max-md:flex-col">
          <input value={identifyText} onChange={(e) => setIdentifyText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runIdentify()} placeholder="e.g. 'the seated chest machine at my gym' or 'lat thing with the wide bar'" className="flex-1" />
          <button disabled={identifying} onClick={() => runIdentify()} className="flex items-center justify-center gap-1.5 rounded-md border border-text-primary bg-text-primary px-4 py-2 text-xs font-semibold text-white hover:bg-[#2e2d27] disabled:opacity-50">
            <Search className="h-3.5 w-3.5" /> Identify
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          <button disabled={identifying} onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-md border border-border-subtle bg-white px-4 py-2 text-xs font-semibold text-text-primary hover:bg-bg-primary disabled:opacity-50">
            <Camera className="h-3.5 w-3.5" /> Photo
          </button>
        </div>

        {identifying && <p className="mt-3 text-xs italic text-text-secondary">Analyzing…</p>}

        {identifyResult && (
          <div className="mt-4 rounded-lg border border-border-subtle bg-bg-primary/20 p-4">
            <h3 className="mb-1 font-serif text-[15px] font-bold">{identifyResult.exerciseName}</h3>
            {identifyResult.alternativeNames?.length > 0 && <p className="mb-2 text-[11px] text-text-muted">Also known as: {identifyResult.alternativeNames.join(", ")}</p>}
            <p className="mb-2 text-[12.5px] text-text-secondary"><strong className="text-text-primary">Primary muscles:</strong> {(identifyResult.primaryMuscles || []).join(", ")}</p>
            {identifyResult.difficulty && <p className="mb-2 text-[12.5px] text-text-secondary"><strong className="text-text-primary">Difficulty:</strong> {identifyResult.difficulty}</p>}
            {identifyResult.properForm && <p className="mb-2 text-[12.5px] text-text-secondary"><strong className="text-text-primary">Form:</strong> {identifyResult.properForm}</p>}
            {identifyResult.formObservations && <p className="mb-2 text-[12.5px] text-text-secondary"><strong className="text-text-primary">From your photo:</strong> {identifyResult.formObservations}</p>}
            {identifyResult.commonMistakes?.length > 0 && <p className="mb-2 text-[12.5px] text-text-secondary"><strong className="text-text-primary">Common mistakes:</strong> {identifyResult.commonMistakes.join("; ")}</p>}
            {identifyResult.safetyAssessment && (
              <p className="mb-2 rounded bg-white p-2.5 text-[12px] leading-relaxed text-text-primary border border-border-subtle">
                <strong>Safety for you:</strong> {identifyResult.safetyAssessment}
              </p>
            )}
            {identifyResult.suitableAlternatives?.length > 0 && <p className="text-[12.5px] text-text-secondary"><strong className="text-text-primary">Alternatives:</strong> {identifyResult.suitableAlternatives.join(", ")}</p>}
          </div>
        )}
      </div>

      {/* Browse */}
      <div className={card}>
        <h2 className="mb-4 font-serif text-base font-bold">Browse the Encyclopedia</h2>
        <div className="mb-4 flex gap-2 max-md:flex-col">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, category, or muscle…" className="flex-1" />
          <select value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value)} className="max-md:w-full">
            <option value="">All muscles</option>
            {MUSCLE_GROUPS.map((m) => <option key={m} value={m}>{label(m)}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-xs text-text-secondary">Loading…</p>
        ) : results.length === 0 ? (
          <p className="text-xs italic text-text-muted">No exercises matched.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
            {results.map((ex) => (
              <div key={ex.id} className="rounded-lg border border-border-subtle bg-bg-primary/20 p-3.5 cursor-pointer" onClick={() => setExpanded(expanded === ex.id ? null : ex.id)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold">{ex.name}</span>
                  {ex.safety.safe ? (
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#16a34a]" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 shrink-0 text-[#b3666b]" />
                  )}
                </div>
                <p className="mt-1 text-[11px] text-text-secondary">{label(ex.category)} · {ex.primaryMuscles.map(label).join(", ")}</p>
                {!ex.safety.safe && (
                  <p className="mt-1.5 text-[10.5px] font-medium text-[#b3666b]">Caution: {ex.safety.reasons[0]}</p>
                )}
                {expanded === ex.id && (
                  <div className="mt-2.5 border-t border-border-subtle pt-2.5 text-[11.5px] leading-relaxed text-text-secondary">
                    <p className="mb-1.5"><strong className="text-text-primary">Form:</strong> {ex.formTips.join(" ")}</p>
                    {ex.commonMistakes.length > 0 && <p className="mb-1.5"><strong className="text-text-primary">Mistakes to avoid:</strong> {ex.commonMistakes.join("; ")}</p>}
                    {ex.alternatives.length > 0 && <p><strong className="text-text-primary">Alternatives:</strong> {ex.alternatives.join(", ")}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
