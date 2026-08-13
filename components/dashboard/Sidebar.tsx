import React from "react";
import { FirebaseUser } from "@/types";
import { isSafeImageUrl } from "@/lib/safe-url";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: FirebaseUser | null;
  setShowOnboarding: (show: boolean) => void;
  triggerConfirm: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean, confirmText?: string) => void;
  firebaseAuth: any;
  conditionsCount: number;
}

const navLinkClass = (active: boolean) =>
  `mb-1 flex cursor-pointer items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium no-underline transition-all duration-200 ${
    active ? "bg-bg-primary font-semibold text-text-primary" : "text-text-secondary hover:bg-bg-primary hover:text-text-primary"
  }`;

export const TABS = [
  { id: "overview", label: "Overview", icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
  ) },
  { id: "health-profile", label: "Health Profile", icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
  ) },
  { id: "workouts", label: "Workout Log", icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.5 6.5 17.5 17.5M6.5 17.5 17.5 6.5"/><rect x="2" y="9" width="4" height="6" rx="1"/><rect x="18" y="9" width="4" height="6" rx="1"/><rect x="7" y="10.5" width="10" height="3" rx="1"/></svg>
  ) },
  { id: "exercises", label: "Exercise Library", icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  ) },
  { id: "coach", label: "Coach Insights", icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  ) },
  { id: "notes", label: "Quick Notes", icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
  ) },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, setShowOnboarding, triggerConfirm, firebaseAuth, conditionsCount }) => {
  return (
    <aside className="fixed top-0 bottom-0 left-0 z-[100] flex w-[250px] flex-col justify-between border-r border-border-subtle bg-bg-sidebar px-4 py-6 max-md:hidden min-[769px]:max-[1100px]:w-[210px]">
      {/* Brand Header */}
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2">
          <path d="M6.5 6.5 17.5 17.5M6.5 17.5 17.5 6.5" />
          <rect x="2" y="9" width="4" height="6" rx="1" fill="var(--text-primary)" stroke="none" />
          <rect x="18" y="9" width="4" height="6" rx="1" fill="var(--text-primary)" stroke="none" opacity="0.85" />
          <rect x="7" y="10.5" width="10" height="3" rx="1" fill="var(--text-primary)" stroke="none" opacity="0.55" />
        </svg>
        <span className="text-base font-bold tracking-[-0.3px]">FitHub Coach</span>
      </div>

      {/* Main Navigation */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {TABS.map((tab) => (
          <div key={tab.id} onClick={() => setActiveTab(tab.id)} className={navLinkClass(activeTab === tab.id)}>
            {tab.icon}
            <span className="flex-1">{tab.label}</span>
            {tab.id === "health-profile" && conditionsCount > 0 && (
              <span className="rounded-full bg-[#b3666b1a] px-1.5 py-0.5 text-[9px] font-bold text-[#b3666b]">{conditionsCount}</span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 flex flex-col gap-1">
        <div className="border-t border-border-subtle my-2 mx-1" />
        <a href="/assistant" className="mb-1 flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-medium text-text-secondary no-underline transition-all duration-200 hover:bg-bg-primary hover:text-text-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></svg>
          Connect AI Agent
        </a>
        <a href="/api/openapi.json" target="_blank" rel="noopener noreferrer" className="mb-1 flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-medium text-text-secondary no-underline transition-all duration-200 hover:bg-bg-primary hover:text-text-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>
          OpenAPI Spec
        </a>
        <button onClick={() => setShowOnboarding(true)} className="mb-1 flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-3.5 py-2.5 text-left text-xs font-medium text-text-secondary transition-all duration-200 hover:bg-bg-primary hover:text-text-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Feature Guide
        </button>

        {user && (
          <div className="mt-4 flex items-center gap-2.5 border-t border-border-subtle px-3.5 py-3">
            {isSafeImageUrl(user.photoURL) ? (
              <img src={user.photoURL} alt="profile" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary text-[13px] font-semibold text-white">
                {(user.displayName || user.email || "U")[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold text-text-primary">{user.displayName || "User"}</p>
              <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-text-muted">{user.email}</p>
            </div>
            <button
              onClick={() => {
                triggerConfirm(
                  "Sign Out",
                  "Are you sure you want to sign out?",
                  async () => {
                    if (firebaseAuth) await firebaseAuth.signOut(firebaseAuth.auth);
                  },
                  false,
                  "Sign Out"
                );
              }}
              title="Sign out"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-text-muted transition-all duration-200 hover:bg-bg-primary hover:text-text-primary p-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
