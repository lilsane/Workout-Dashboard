"use client";

import React, { useEffect, useRef, useState } from "react";
import type { TabProps } from "./tabTypes";

export const NotesTab: React.FC<TabProps> = ({ getHeaders }) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/notes", { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setContent(data.content || "");
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (value: string) => {
    setContent(value);
    setSaving(true);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await fetch("/api/notes", { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ content: value }) });
      } finally {
        setSaving(false);
      }
    }, 800);
  };

  return (
    <div className="flex flex-col gap-5 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-[-0.5px]">Quick Notes</h1>
        <span className="text-xs text-text-muted">{saving ? "Saving..." : "Saved"}</span>
      </div>

      <div className="w-full">
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={loading ? "Loading notes..." : "Anything you want the coach to remember between sessions..."}
          rows={24}
          className="w-full resize-y border-none bg-transparent px-0 py-4 text-sm leading-[1.6] text-text-primary outline-none"
        />
      </div>
    </div>
  );
};
