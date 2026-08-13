"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FirebaseUser } from "@/types";
import { LandingPage } from "@/components/landing/LandingPage";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { ConfirmModal, ConfirmState } from "@/components/dashboard/ConfirmModal";
import { OnboardingModal } from "@/components/dashboard/OnboardingModal";
import { CoachChatBubble } from "@/components/dashboard/CoachChatBubble";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { HealthProfileTab } from "@/components/dashboard/HealthProfileTab";
import { WorkoutLogTab } from "@/components/dashboard/WorkoutLogTab";
import { ExerciseLibraryTab } from "@/components/dashboard/ExerciseLibraryTab";
import { CoachTab } from "@/components/dashboard/CoachTab";
import { NotesTab } from "@/components/dashboard/NotesTab";

interface FirebaseAuthModule {
  auth: any;
  GoogleAuthProvider: any;
  signInWithPopup: any;
  signOut: any;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [firebaseAuth, setFirebaseAuth] = useState<FirebaseAuthModule | null>(null);
  const [conditionsCount, setConditionsCount] = useState(0);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [confirmDlg, setConfirmDlg] = useState<ConfirmState>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const getHeaders = useCallback(
    (): HeadersInit => ({ "Content-Type": "application/json", Authorization: `Bearer ${user?.idToken || ""}` }),
    [user]
  );

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, isDestructive = true, confirmText = "Delete", cancelText = "Cancel") => {
    setConfirmDlg({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDlg((prev) => ({ ...prev, isOpen: false }));
      },
      confirmText,
      cancelText,
      isDestructive,
      variant: "confirm",
    });
  };

  const triggerAlert = (title: string, message: string, tone: "danger" | "success" | "info" = "info", confirmText = "OK") => {
    setConfirmDlg({
      isOpen: true,
      title,
      message,
      onConfirm: () => setConfirmDlg((prev) => ({ ...prev, isOpen: false })),
      confirmText,
      variant: "alert",
      tone,
    });
  };

  // Firebase Auth bootstrap
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    import("firebase/app").then(async ({ initializeApp, getApps }) => {
      const res = await fetch("/api/auth/config");
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
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signIn = async () => {
    if (!firebaseAuth) return;
    setSigningIn(true);
    try {
      await firebaseAuth.signInWithPopup(firebaseAuth.auth, new firebaseAuth.GoogleAuthProvider());
    } catch (err: any) {
      triggerAlert("Sign-in failed", err.message || "Please try again.", "danger");
    } finally {
      setSigningIn(false);
    }
  };

  // Onboarding: show once per browser for first-time users
  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem("fithub_onboarding_seen")) return;
    localStorage.setItem("fithub_onboarding_seen", "1");
    setShowOnboarding(true);
  }, [user]);

  // Sidebar condition-count badge
  useEffect(() => {
    if (!user) {
      setConditionsCount(0);
      return;
    }
    fetch("/api/health-profile", { headers: getHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setConditionsCount(data?.conditions?.filter((c: any) => !c.resolved).length || 0))
      .catch(() => {});
  }, [user, getHeaders]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <p className="font-mono text-sm text-text-secondary">Loading FitHub Coach…</p>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onSignIn={signIn} loading={signingIn} />;
  }

  const tabProps = { getHeaders, triggerAlert, triggerConfirm };

  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        setShowOnboarding={setShowOnboarding}
        triggerConfirm={triggerConfirm}
        firebaseAuth={firebaseAuth}
        conditionsCount={conditionsCount}
      />
      <MobileHeader activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="md:ml-[250px] min-[769px]:max-[1100px]:md:ml-[210px] px-8 py-8 max-md:px-4 max-md:py-5 max-w-[1100px]">
        {activeTab === "overview" && <OverviewTab {...tabProps} setActiveTab={setActiveTab} />}
        {activeTab === "health-profile" && <HealthProfileTab {...tabProps} />}
        {activeTab === "workouts" && <WorkoutLogTab {...tabProps} />}
        {activeTab === "exercises" && <ExerciseLibraryTab {...tabProps} />}
        {activeTab === "coach" && <CoachTab {...tabProps} />}
        {activeTab === "notes" && <NotesTab {...tabProps} />}
      </main>

      <ConfirmModal confirmDlg={confirmDlg} setConfirmDlg={setConfirmDlg} />
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <CoachChatBubble idToken={user.idToken} />
    </div>
  );
}
