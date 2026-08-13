"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { TABS } from "./Sidebar";

interface MobileHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// Hamburger menu + slide-out nav drawer for narrow viewports, mirroring the
// desktop Sidebar's tab list. Rendered via a portal so the drawer overlay
// covers the full screen regardless of the page's stacking context.
export const MobileHeader: React.FC<MobileHeaderProps> = ({ activeTab, setActiveTab }) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeLabel = TABS.find((t) => t.id === activeTab)?.label || "FitHub Coach";

  return (
    <>
      <header className="sticky top-0 z-50 hidden max-md:flex items-center justify-between border-b border-border-subtle bg-bg-sidebar px-4 py-3">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2">
            <path d="M6.5 6.5 17.5 17.5M6.5 17.5 17.5 6.5" />
            <rect x="2" y="9" width="4" height="6" rx="1" fill="var(--text-primary)" stroke="none" />
            <rect x="18" y="9" width="4" height="6" rx="1" fill="var(--text-primary)" stroke="none" opacity="0.85" />
          </svg>
          <span className="text-sm font-bold">{activeLabel}</span>
        </div>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-text-primary hover:bg-bg-primary" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
            <div className="h-full w-72 max-w-[80vw] bg-bg-sidebar p-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between px-1">
                <span className="text-base font-bold">FitHub Coach</span>
                <button onClick={() => setOpen(false)} className="rounded p-1.5 text-text-secondary hover:bg-bg-primary hover:text-text-primary">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {TABS.map((tab) => (
                  <div
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setOpen(false);
                    }}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                      activeTab === tab.id ? "bg-bg-primary font-semibold text-text-primary" : "text-text-secondary hover:bg-bg-primary hover:text-text-primary"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-border-subtle pt-4">
                <a href="/assistant" className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-medium text-text-secondary no-underline hover:bg-bg-primary hover:text-text-primary">
                  Connect AI Agent
                </a>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
