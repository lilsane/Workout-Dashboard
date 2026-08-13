"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FirebaseUser } from "@/types";
import { Shield, Trash2, RefreshCw, ArrowLeft, Dumbbell } from "lucide-react";

interface FirebaseAuthModule {
  auth: any;
  GoogleAuthProvider: any;
  signInWithPopup: any;
  signOut: any;
}

export default function AdminPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseAuth, setFirebaseAuth] = useState<FirebaseAuthModule | null>(null);

  const [stats, setStats] = useState<{ workouts: number; conditions: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [gptMetrics, setGptMetrics] = useState<any>(null);

  const [flushLoading, setFlushLoading] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    import("firebase/app").then(async ({ initializeApp, getApps }) => {
      try {
        const res = await fetch("/api/auth/config");
        if (!res.ok) throw new Error("Failed to load auth config");
        const config = await res.json();
        const app = getApps().length ? getApps()[0] : initializeApp(config);

        const { getAuth, GoogleAuthProvider, signInWithPopup, signOut } = await import("firebase/auth");
        const auth = getAuth(app);
        setFirebaseAuth({ auth, GoogleAuthProvider, signInWithPopup, signOut });

        unsubscribe = auth.onAuthStateChanged(async (fbUser: any) => {
          if (fbUser) {
            const idToken = await fbUser.getIdToken();
            setUser({ uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName, photoURL: fbUser.photoURL, idToken });
          } else {
            setUser(null);
          }
          setAuthLoading(false);
        });
      } catch (err) {
        console.error("Auth initialization failed:", err);
        setAuthLoading(false);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAdmin = !!user && !!adminEmail && user.email === adminEmail;

  useEffect(() => {
    if (!isAdmin || !user) return;

    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const headers = { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` };
        const [workoutsRes, profileRes, metricsRes] = await Promise.all([
          fetch("/api/workouts", { headers }),
          fetch("/api/health-profile", { headers }),
          fetch("/api/admin/metrics", { headers }),
        ]);
        const workouts = workoutsRes.ok ? await workoutsRes.json() : [];
        const profile = profileRes.ok ? await profileRes.json() : null;
        const metrics = metricsRes.ok ? await metricsRes.json() : null;

        setStats({
          workouts: Array.isArray(workouts) ? workouts.length : 0,
          conditions: profile?.conditions?.length || 0,
        });
        setGptMetrics(metrics);
      } catch (err) {
        console.error("Failed to load admin stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [isAdmin, user]);

  const login = () => {
    if (firebaseAuth) firebaseAuth.signInWithPopup(firebaseAuth.auth, new firebaseAuth.GoogleAuthProvider());
  };

  const logout = () => {
    if (firebaseAuth) firebaseAuth.signOut(firebaseAuth.auth);
  };

  const flushCache = async () => {
    if (!user) return;
    setFlushLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/cache-flush", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` } });
      const data = await res.json();
      if (res.ok) setStatusMessage({ text: "Redis cache cleared successfully!", type: "success" });
      else throw new Error(data.error || "Failed to flush cache");
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Cache flush failed.", type: "error" });
    } finally {
      setFlushLoading(false);
    }
  };

  const runEncryptionMigration = async () => {
    if (!user) return;
    setMigrationLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/migrate-encryption", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` } });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: `Encryption migration complete! ${data.usersProcessed} users scanned — ${data.workoutsMigrated} workouts and ${data.conditionsMigrated} conditions re-encrypted.`, type: "success" });
      } else {
        throw new Error(data.error || "Failed to run migration");
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Migration failed.", type: "error" });
    } finally {
      setMigrationLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f3ec]">
        <p className="text-sm text-text-secondary font-mono">Loading FitHub Admin Panel…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f3ec]">
        <div className="flex w-[400px] flex-col gap-6 rounded-card border border-border-subtle bg-white p-8 text-center shadow-subtle">
          <Shield className="mx-auto h-12 w-12 text-[#b3666b]" />
          <div>
            <h1 className="font-serif text-2xl font-bold text-text-primary">Admin Access</h1>
            <p className="mt-2 text-xs text-text-secondary">Please sign in with your administrative account to continue.</p>
          </div>
          <button onClick={login} className="rounded-md border border-text-primary bg-text-primary py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#2e2d27]">
            Sign In with Google
          </button>
          <Link href="/" className="text-xs text-text-secondary hover:text-text-primary flex items-center justify-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f3ec]">
        <div className="flex w-[400px] flex-col gap-6 rounded-card border border-border-subtle bg-[#fef2f2] p-8 text-center shadow-subtle">
          <Shield className="mx-auto h-12 w-12 text-[#dc2626]" />
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#991b1b]">Access Denied</h1>
            <p className="mt-2 text-xs text-[#991b1b]/80">Your account ({user.email}) is not authorized to access the admin panel.</p>
          </div>
          <div className="flex flex-col gap-2.5">
            <button onClick={logout} className="rounded-md border border-[#dc2626] bg-[#dc2626] py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#b91c1c]">
              Sign Out
            </button>
            <Link href="/" className="text-xs text-text-secondary hover:text-text-primary flex items-center justify-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f3ec] p-10 max-md:p-5">
      <div className="mx-auto max-w-[900px] flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-border-subtle pb-5 max-sm:flex-col max-sm:items-start max-sm:gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-text-primary" />
            <div>
              <h1 className="font-serif text-2xl font-bold text-text-primary">Admin Control Panel</h1>
              <p className="text-xs text-text-secondary">Logged in as {user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-md border border-border-subtle bg-white px-4 py-2 text-xs font-semibold text-text-primary hover:bg-bg-primary transition-all">
              Dashboard
            </Link>
            <button onClick={logout} className="rounded-md border border-border-subtle bg-[#b3666b]/10 text-[#b3666b] px-4 py-2 text-xs font-semibold hover:bg-[#b3666b]/20 transition-all">
              Sign Out
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`rounded-lg border px-4 py-3 text-xs ${
              statusMessage.type === "success"
                ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
                : statusMessage.type === "error"
                ? "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
                : "border-border-subtle bg-white text-text-primary"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          {[
            { label: "LOGGED WORKOUTS", val: statsLoading ? "..." : stats?.workouts },
            { label: "TRACKED CONDITIONS", val: statsLoading ? "..." : stats?.conditions },
          ].map((card, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-card border border-border-subtle bg-white p-5 shadow-subtle">
              <span className="font-mono text-[9px] font-bold tracking-[0.8px] text-text-secondary uppercase">{card.label}</span>
              <span className="text-[20px] font-bold tracking-tight text-text-primary mt-1">{card.val}</span>
            </div>
          ))}
        </div>

        <div className="rounded-card border border-border-subtle bg-white p-6 shadow-subtle flex flex-col gap-4">
          <h3 className="font-serif text-base font-bold text-text-primary flex items-center gap-2 border-b border-border-subtle pb-2">
            <Dumbbell className="h-4.5 w-4.5" /> Custom GPT Integration Analytics
          </h3>
          <div className="grid grid-cols-[1.5fr_1fr] gap-6 max-md:grid-cols-1">
            <div>
              <h4 className="text-[12.5px] font-bold text-text-primary mb-2">Connected GPT Users ({gptMetrics?.activeUsersCount || 0})</h4>
              {gptMetrics?.users && gptMetrics.users.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {gptMetrics.users.map((gptUser: any) => (
                    <div key={gptUser.email} className="flex justify-between items-center rounded border border-border-subtle bg-bg-primary/20 p-2.5">
                      <div className="text-[12px] font-medium text-text-primary truncate max-w-[200px]">{gptUser.email}</div>
                      <div className="text-[10px] text-text-secondary">
                        Last Active: {gptUser.lastActive ? new Date(gptUser.lastActive).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "Never"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-secondary italic">No users have authorized Custom GPT actions yet.</p>
              )}
            </div>

            <div className="flex flex-col gap-4 border-l border-border-subtle pl-6 max-md:border-l-0 max-md:pl-0">
              <div>
                <div className="text-[10px] font-bold font-mono tracking-wider text-text-secondary uppercase">TOTAL API CALLS</div>
                <div className="text-2xl font-bold mt-1">{gptMetrics?.totalCalls || 0}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold font-mono tracking-wider text-text-secondary uppercase mb-2">7-DAY VOLUME</div>
                {gptMetrics?.dailyUsage ? (
                  <div className="flex flex-col gap-1.5 font-mono text-[10.5px]">
                    {gptMetrics.dailyUsage.map((day: any) => (
                      <div key={day.date} className="flex justify-between border-b border-bg-primary pb-1">
                        <span>{day.date}</span>
                        <span className="font-bold">{day.calls} call{day.calls === 1 ? "" : "s"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary italic">No usage recorded.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-card border border-border-subtle bg-white p-6 shadow-subtle flex flex-col gap-4">
          <h3 className="font-serif text-base font-bold text-text-primary flex items-center gap-2 border-b border-border-subtle pb-2">
            <RefreshCw className="h-4.5 w-4.5" /> Database & Cache Operations
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Management commands for database encryption and cache state. Encryption now runs across every registered user, not just this account.
          </p>
          <div className="flex flex-col gap-2 max-w-md">
            <button
              disabled={flushLoading}
              onClick={flushCache}
              className="w-full flex items-center justify-center gap-2 cursor-pointer rounded-md border border-text-primary bg-text-primary text-xs font-semibold text-white py-3 transition-all hover:bg-[#2e2d27] disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> {flushLoading ? "Flushing Cache..." : "Flush Redis Cache"}
            </button>
            <button
              disabled={migrationLoading}
              onClick={runEncryptionMigration}
              className="w-full flex items-center justify-center gap-2 cursor-pointer rounded-md border border-border-subtle bg-transparent text-xs font-semibold text-text-primary py-3 transition-all hover:bg-bg-primary disabled:opacity-50"
            >
              <Shield className="h-4.5 w-4.5" /> {migrationLoading ? "Encrypting Records..." : "Re-encrypt All Users' Data"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
