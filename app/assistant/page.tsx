"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { Auth, GoogleAuthProvider as GoogleAuthProviderClass, signInWithPopup as signInWithPopupFn } from "firebase/auth";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { useOrigin } from "@/hooks/useOrigin";

interface AgentUser {
  displayName: string | null;
  email: string;
}

interface AuthApi {
  auth: Auth;
  GoogleAuthProvider: typeof GoogleAuthProviderClass;
  signInWithPopup: typeof signInWithPopupFn;
}

export default function AssistantIntegrationPage() {
  const [authApi, setAuthApi] = useState<AuthApi | null>(null);
  const [user, setUser] = useState<AgentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const origin = useOrigin();
  const [copied, setCopied] = useState<string>("");
  const [tokenBusy, setTokenBusy] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    (async () => {
      try {
        const res = await fetch("/api/auth/config");
        if (!res.ok) throw new Error("Could not load Firebase configuration.");
        const config = await res.json();

        const { initializeApp, getApps } = await import("firebase/app");
        const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } = await import("firebase/auth");

        const appName = "fithub-client";
        const apps = getApps();
        const app = apps.find((a) => a.name === appName) || initializeApp(config, appName);
        const auth = getAuth(app);
        setAuthApi({ auth, GoogleAuthProvider, signInWithPopup });

        unsubscribe = onAuthStateChanged(auth, (fbUser) => {
          setUser(fbUser ? { displayName: fbUser.displayName, email: fbUser.email || "" } : null);
          setAuthLoading(false);
        });
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : "Could not load Firebase configuration.");
        setAuthLoading(false);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const schemaUrl = `${origin || SITE_URL}/api/openapi.json`;

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((prev) => (prev === key ? "" : prev)), 2500);
    } catch {
      setAuthError("Clipboard access was blocked — copy manually instead.");
    }
  }

  async function copyToken() {
    if (!authApi?.auth?.currentUser) return;
    setTokenBusy(true);
    try {
      const token = await authApi.auth.currentUser.getIdToken(true);
      await copyText("token", token);
    } catch {
      setAuthError("Could not refresh the token. Try signing in again.");
    } finally {
      setTokenBusy(false);
    }
  }

  async function copyPermanentKey() {
    if (!authApi?.auth?.currentUser) return;
    setTokenBusy(true);
    try {
      const key = authApi.auth.currentUser.refreshToken;
      await copyText("perm_key", key);
    } catch {
      setAuthError("Could not retrieve key. Try signing in again.");
    } finally {
      setTokenBusy(false);
    }
  }

  async function signIn() {
    if (!authApi) return;
    try {
      await authApi.signInWithPopup(authApi.auth, new authApi.GoogleAuthProvider());
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Sign-in failed.");
    }
  }

  const agentInstructions = `You are my personal AI Strength Coach, Physiotherapist, Workout Tracker, Recovery Coach, Exercise Identifier, and Health Assistant. You manage my health profile and workout log through the API actions on this dashboard.

Start every new conversation by calling getHealthProfile so you know my baseline (conditions, goals, experience) before recommending anything.

When I describe a gym session ("I went to gym", or list exercises/sets/reps), call logWorkout with a structured entry — infer workoutType and muscles from context when I don't state them.

When I mention pain, an injury, or a diagnosis, call addHealthCondition (new) or updateHealthCondition (to resolve one) — never let a mentioned condition go unrecorded, and never mark one resolved unless I explicitly say so.

When I mention weight or body measurements, call logMeasurementSnapshot.

When I ask "how was my week" or about balance, call getWeeklyAnalysis and summarize frequency, push/pull and upper/lower balance, and neglected muscles plainly.

When I ask what to train next, call getNextWorkoutRecommendation and explain the reasoning and any safety cautions.

When I name or describe an exercise or machine, call searchExercises first (fall back to identifyExercise for anything not found, or when I upload a photo) and always mention the safety flag against my conditions.

Never recommend consecutive heavy sessions for the same muscle group. If I describe pain, separate possibilities from confirmed facts and suggest a medical evaluation instead of pushing through when it sounds serious. If I miss workouts, never shame me — just encourage consistency. Prioritize safety over maximizing workload, always.`;

  const examplePrompts = [
    "I went to gym — bench press 3x8 at 60kg, then squats 3x5 at 80kg",
    "My neck's been stiff every morning this week",
    "What should I train today?",
    "How was my week?",
    "Is a barbell overhead press safe given my shoulder?",
  ];

  const CODE_CLASS = "rounded-[5px] bg-bg-secondary px-[7px] py-0.5 font-mono text-xs break-all";
  const BENTO_CARD = "rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle";
  const BTN_PRIMARY = "rounded-md border border-text-primary bg-text-primary text-[13px] font-medium text-white transition-all duration-200 hover:border-[#2e2d27] hover:bg-[#2e2d27] disabled:cursor-not-allowed disabled:opacity-50";
  const BTN_SECONDARY = "rounded-md border border-border-subtle bg-transparent text-[13px] font-medium text-text-primary transition-all duration-200 hover:bg-bg-primary disabled:cursor-not-allowed disabled:opacity-50";

  const stepBadge = (n: number) => (
    <span className="inline-flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-text-primary text-[13px] font-bold text-white">{n}</span>
  );

  return (
    <div className="min-h-screen bg-bg-primary px-5 py-10">
      <div className="mx-auto flex max-w-195 flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2">
              <path d="M6.5 6.5 17.5 17.5M6.5 17.5 17.5 6.5" />
              <rect x="2" y="9" width="4" height="6" rx="1" fill="var(--text-primary)" stroke="none" />
              <rect x="18" y="9" width="4" height="6" rx="1" fill="var(--text-primary)" stroke="none" opacity="0.85" />
            </svg>
            <span className="text-[19px] font-bold tracking-[-0.5px]">{SITE_NAME}</span>
          </div>
          <Link href="/" className="mb-0 flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-text-secondary no-underline transition-all duration-200 hover:bg-bg-primary hover:text-text-primary">← Back to dashboard</Link>
        </div>

        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.5px]">ChatGPT Setup Guide</h1>
          <p className="mt-2 text-sm leading-[1.6] text-text-secondary">
            Connect this dashboard to a Custom GPT so you can log workouts and get coaching advice straight from a chat. If you prefer a native chat, it's already available as the floating bubble in the bottom right of the dashboard.
          </p>
        </div>

        {authError && <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3.5 py-2.5 text-xs text-[#dc2626]">{authError}</div>}

        <div className={`${BENTO_CARD} flex gap-4`}>
          {stepBadge(1)}
          <div className="min-w-0 flex-1">
            <h2 className="mb-1.5 text-[15px] font-semibold">Create a Custom GPT</h2>
            <p className="text-[13px] leading-[1.7] text-text-secondary">
              In ChatGPT, go to Explore GPTs → Create → Configure. Keep sharing set to <strong>Only me</strong> — this agent will hold a token to your health data.
            </p>
          </div>
        </div>

        <div className={`${BENTO_CARD} flex gap-4`}>
          {stepBadge(2)}
          <div className="min-w-0 flex-1">
            <h2 className="mb-1.5 text-[15px] font-semibold">Import the API schema</h2>
            <p className="mb-3 text-[13px] leading-[1.7] text-text-secondary">Under Actions, choose to import a schema from a URL and paste this:</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className={CODE_CLASS}>{schemaUrl}</span>
              <button onClick={() => copyText("schema", schemaUrl)} className={`${BTN_SECONDARY} px-3 py-1.5 text-xs`}>
                {copied === "schema" ? "✓ Copied" : "Copy URL"}
              </button>
            </div>
          </div>
        </div>

        <div className={`${BENTO_CARD} flex gap-4`}>
          {stepBadge(3)}
          <div className="min-w-0 flex-1">
            <h2 className="mb-1.5 text-[15px] font-semibold">Authenticate your GPT</h2>
            <p className="mb-3 text-[13px] leading-[1.7] text-text-secondary">Configure how the GPT authenticates with your dashboard:</p>

            <div className="flex flex-col gap-4">
              <div className="border border-border-subtle rounded-lg p-4 bg-bg-primary/20">
                <h3 className="font-serif text-[13px] font-bold text-text-primary mb-1">Option A: OAuth 2.0 (Recommended)</h3>
                <p className="text-[11.5px] text-text-secondary leading-relaxed mb-3">Under Authentication, select <strong>OAuth</strong> and configure these endpoints:</p>
                <table className="w-full text-[11px] font-mono text-text-secondary border-collapse">
                  <tbody>
                    <tr>
                      <td className="pr-3 pb-1 font-bold text-text-primary">Auth URL:</td>
                      <td className="pb-1 break-all">{origin || SITE_URL}/api/oauth/authorize</td>
                    </tr>
                    <tr>
                      <td className="pr-3 font-bold text-text-primary">Token URL:</td>
                      <td className="break-all">{origin || SITE_URL}/api/oauth/token</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="border border-border-subtle rounded-lg p-4 bg-bg-primary/20 min-h-[82px] flex flex-col justify-center">
                <h3 className="font-serif text-[13px] font-bold text-text-primary mb-1">Option B: Permanent API Key (manual)</h3>
                <p className="text-[11.5px] text-text-secondary leading-relaxed mb-3">Under Authentication, select <strong>API Key</strong> → <strong>Bearer</strong>, and paste your key.</p>

                {authLoading ? (
                  <p className="text-xs text-text-muted">Checking sign-in…</p>
                ) : user ? (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-xs text-text-secondary">Signed in as <strong>{user.displayName || user.email}</strong></p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={copyPermanentKey} disabled={tokenBusy} className={`${BTN_PRIMARY} px-3 py-1.5 text-xs`}>
                        {tokenBusy ? "Generating…" : copied === "perm_key" ? "✓ Permanent Key Copied" : "Copy Permanent API Key"}
                      </button>
                      <button onClick={copyToken} disabled={tokenBusy} className={`${BTN_SECONDARY} px-3 py-1.5 text-xs`}>
                        {tokenBusy ? "Generating…" : copied === "token" ? "✓ Token Copied" : "Copy 1-Hour ID Token"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={signIn} disabled={!authApi} className={`${BTN_PRIMARY} px-4 py-2 text-xs`}>Sign in to retrieve API Key</button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`${BENTO_CARD} flex gap-4`}>
          {stepBadge(4)}
          <div className="min-w-0 flex-1">
            <h2 className="mb-1.5 text-[15px] font-semibold">Teach it the coach persona</h2>
            <p className="mb-3 text-[13px] leading-[1.7] text-text-secondary">Paste this into the GPT&apos;s <strong>Instructions</strong> field:</p>
            <pre className="max-h-65 overflow-y-auto rounded-lg bg-bg-secondary p-3.5 font-mono text-[11.5px] leading-[1.6] whitespace-pre-wrap wrap-break-word text-text-primary">{agentInstructions}</pre>
            <button onClick={() => copyText("instructions", agentInstructions)} className={`${BTN_SECONDARY} mt-2.5 px-3 py-1.5 text-xs`}>
              {copied === "instructions" ? "✓ Copied" : "Copy instructions"}
            </button>
          </div>
        </div>

        <div className={`${BENTO_CARD} flex gap-4`}>
          {stepBadge(5)}
          <div className="min-w-0 flex-1">
            <h2 className="mb-1.5 text-[15px] font-semibold">Try it out</h2>
            <div className="flex flex-col gap-2">
              {examplePrompts.map((prompt) => (
                <div key={prompt} className="rounded-lg bg-bg-secondary px-3 py-2 text-[12.5px] text-text-primary">&ldquo;{prompt}&rdquo;</div>
              ))}
            </div>
          </div>
        </div>

        <p className="pb-5 text-center text-[11px] text-text-muted">
          The raw schema is at <a href="/api/openapi.json" target="_blank" rel="noopener noreferrer" className="text-text-secondary">/api/openapi.json</a>.
        </p>
      </div>
    </div>
  );
}
