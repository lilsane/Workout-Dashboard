"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, HeartPulse, Dumbbell, BookOpen, LineChart, NotebookPen, Bot } from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEATURES = [
  { icon: HeartPulse, title: "Health Profile", body: "Your baseline: personal details, body measurements, and every medical condition or injury — remembered permanently and factored into every recommendation." },
  { icon: Dumbbell, title: "Workout Log", body: "Log a session (or just tell the coach chat 'I went to gym') to record exercises, sets/reps/weight, recovery status, and any pain — chronologically, forever." },
  { icon: BookOpen, title: "Exercise Library", body: "Search any machine, barbell, dumbbell, or bodyweight movement for muscles worked, form cues, common mistakes, and whether it's safe given your conditions." },
  { icon: LineChart, title: "Coach Insights", body: "Weekly training balance, neglected muscle groups, and what to train next — never two heavy sessions in a row for the same muscle." },
  { icon: NotebookPen, title: "Quick Notes", body: "A lightweight, auto-saving scratchpad for anything you want the coach to remember between sessions." },
  { icon: Bot, title: "Connect ChatGPT", body: "Wire this dashboard up to a Custom GPT so you can log workouts and ask for advice straight from a chat — see the AI Agent link in the sidebar." },
];

// Rendered via a portal into document.body so the backdrop always covers the
// entire viewport (including the sidebar) regardless of the parent stacking
// context it's opened from.
export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-[560px] max-h-[85vh] flex-col overflow-hidden rounded-card border border-border-subtle bg-bg-card shadow-subtle animate-[fadeInScale_0.15s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes fadeInScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }`}</style>
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <h2 className="font-serif text-lg font-bold">Welcome to FitHub Coach</h2>
          <button onClick={onClose} className="rounded p-1 text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-5 text-[13px] leading-relaxed text-text-secondary">
            This is a personal strength coach, physiotherapist, and training journal that remembers your baseline and adapts every recommendation to it. Here's what each part does:
          </p>
          <div className="flex flex-col gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-bg-secondary">
                  <f.icon className="h-4 w-4 text-text-primary" />
                </div>
                <div>
                  <p className="mb-0.5 text-[13.5px] font-semibold">{f.title}</p>
                  <p className="text-[12.5px] leading-relaxed text-text-secondary">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-border-subtle px-6 py-4">
          <button onClick={onClose} className="w-full rounded-lg bg-text-primary py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#2e2d27]">
            Got it, let's start
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
