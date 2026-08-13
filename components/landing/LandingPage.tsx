"use client";

import React from "react";
import { Dumbbell, HeartPulse, LineChart, BookOpen, Bot, ShieldCheck } from "lucide-react";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

interface LandingPageProps {
  onSignIn: () => void;
  loading?: boolean;
}

const FEATURES = [
  { icon: HeartPulse, title: "Remembers your baseline", body: "Injuries, conditions, measurements, and goals — stored once, factored into every recommendation forever." },
  { icon: Dumbbell, title: "Workout journal", body: "Log sessions in seconds; every set, muscle group, and pain flag tracked chronologically." },
  { icon: BookOpen, title: "Exercise encyclopedia", body: "Identify any machine or movement from a name, description, or photo — with a safety check against your conditions." },
  { icon: LineChart, title: "Coach intelligence", body: "Weekly balance analysis and a next-session recommendation that never overloads the same muscle twice in a row." },
  { icon: Bot, title: "Talk to it from ChatGPT", body: "Connect a Custom GPT via secure OAuth and log workouts or ask for advice straight from a chat." },
  { icon: ShieldCheck, title: "Encrypted & private", body: "Health conditions and workout notes are AES-256 encrypted at rest; nothing leaves your own Firebase project." },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, loading }) => {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-10 px-5 py-20 text-center">
        <div className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2">
            <path d="M6.5 6.5 17.5 17.5M6.5 17.5 17.5 6.5" />
            <rect x="2" y="9" width="4" height="6" rx="1" fill="var(--text-primary)" stroke="none" />
            <rect x="18" y="9" width="4" height="6" rx="1" fill="var(--text-primary)" stroke="none" opacity="0.85" />
          </svg>
          <span className="text-xl font-bold tracking-[-0.3px]">{SITE_NAME}</span>
        </div>

        <div>
          <h1 className="mb-4 font-serif text-4xl font-bold leading-tight tracking-[-0.5px] max-md:text-3xl">{SITE_TAGLINE}</h1>
          <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-text-secondary">
            A private, self-hosted strength coach and physiotherapist that remembers your injuries, tracks every workout, and adapts every recommendation to your body — wired up to ChatGPT via a Custom GPT Action.
          </p>
        </div>

        <button
          onClick={onSignIn}
          disabled={loading}
          className="flex items-center gap-2.5 rounded-lg border border-text-primary bg-text-primary px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#2e2d27] disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign In with Google"}
        </button>

        <div className="grid grid-cols-2 gap-4 pt-6 text-left max-md:grid-cols-1">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-3.5 rounded-card border border-border-subtle bg-bg-card p-5 shadow-subtle">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-bg-secondary">
                <f.icon className="h-4 w-4 text-text-primary" />
              </div>
              <div>
                <p className="mb-1 text-[13.5px] font-semibold">{f.title}</p>
                <p className="text-[12.5px] leading-relaxed text-text-secondary">{f.body}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="pt-4 text-[11px] text-text-muted">Not a substitute for professional medical advice. Always consult a doctor or physiotherapist for diagnosis and treatment.</p>
      </div>
    </div>
  );
};
