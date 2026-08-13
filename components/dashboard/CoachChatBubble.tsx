"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, X, Send, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CoachChatBubbleProps {
  idToken?: string;
}

// Floating chat toggle + panel, rendered via a portal into document.body so
// it always sits above the sidebar and every tab's stacking context.
export function CoachChatBubble({ idToken }: CoachChatBubbleProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: "user" | "assistant" | "system"; text: string }[]>([
    { sender: "assistant", text: "Hey — I'm your coach. Tell me about a workout, ask what to train next, or ask me to identify an exercise." },
  ]);
  const [history, setHistory] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleReset = () => {
    setMessages([{ sender: "assistant", text: "Chat history cleared. What's on the agenda today?" }]);
    setHistory([]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !idToken) return;

    const userMsg = input.trim();
    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ message: userMsg, history }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to communicate with the coach.");

      setMessages((prev) => [...prev, { sender: "assistant", text: data.reply }]);
      setHistory(data.history);
    } catch (err: any) {
      setMessages((prev) => [...prev, { sender: "system", text: err.message || "Something went wrong. Please check your credentials." }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (text: string) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="mt-2 mb-1 font-serif text-[14px] font-bold text-text-primary first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="mt-2 mb-1 font-serif text-[13px] font-bold text-text-primary first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mt-1.5 mb-0.5 text-[12.5px] font-bold text-text-primary first:mt-0">{children}</h3>,
        p: ({ children }) => <p className="min-h-[1em] mt-0.5 text-[12.5px] leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-bold text-text-primary">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc ml-4 pl-0.5 mt-0.5 mb-1 flex flex-col gap-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal ml-4 pl-0.5 mt-0.5 mb-1 flex flex-col gap-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-[12.5px] leading-relaxed text-text-secondary">{children}</li>,
        hr: () => <hr className="my-2 border-border-subtle" />,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-text-primary">
            {children}
          </a>
        ),
        code: ({ children }) => <code className="rounded bg-bg-primary/40 px-1 py-0.5 font-mono text-[11px]">{children}</code>,
        table: ({ children }) => (
          <div className="my-1.5 overflow-x-auto">
            <table className="w-full border-collapse text-[11.5px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-bg-primary/40">{children}</thead>,
        th: ({ children }) => <th className="border border-border-subtle px-1.5 py-1 text-left font-bold text-text-primary">{children}</th>,
        td: ({ children }) => <td className="border border-border-subtle px-1.5 py-1 text-text-secondary">{children}</td>,
      }}
    >
      {text}
    </ReactMarkdown>
  );

  if (!mounted) return null;

  return createPortal(
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed max-md:bottom-[76px] bottom-6 right-6 h-12 w-12 rounded-full bg-text-primary text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 z-[9999] cursor-pointer"
        aria-label="Toggle AI Coach"
      >
        {isOpen ? <X className="h-5.5 w-5.5" /> : <MessageSquare className="h-5.5 w-5.5" />}
      </button>

      {isOpen && (
        <div className="fixed max-md:bottom-[136px] bottom-20 right-6 w-96 max-md:w-[calc(100vw-32px)] h-[480px] bg-white border border-border-subtle rounded-card shadow-lg flex flex-col overflow-hidden z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-[#fcfbfa] border-b border-border-subtle px-4.5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <h3 className="font-serif text-[13.5px] font-bold text-text-primary">FitHub Coach</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={handleReset} title="Clear Chat History" className="p-1 rounded hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#faf9f5]">
            {history.length === 0 && (
              <div className="rounded-lg border border-border-subtle bg-white p-3.5 shadow-sm text-[11px] leading-relaxed text-text-secondary flex flex-col gap-1.5 mb-2">
                <span className="font-bold text-text-primary block font-serif">💡 What you can ask:</span>
                <div className="flex flex-col gap-1 font-mono text-[10px]">
                  <div>&quot;I went to gym — bench 3x8 at 60kg, squats 3x5 at 80kg&quot;</div>
                  <div>&quot;My neck's been stiff in the mornings&quot;</div>
                  <div>&quot;What should I train today?&quot;</div>
                  <div>&quot;How was my week?&quot;</div>
                  <div>&quot;Is a barbell overhead press safe for my shoulder?&quot;</div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : msg.sender === "system" ? "justify-center" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3.5 py-2 text-[12.5px] leading-relaxed shadow-sm ${
                    msg.sender === "user"
                      ? "bg-text-primary text-white"
                      : msg.sender === "system"
                      ? "bg-red-50 border border-red-100 text-red-700 text-center font-medium text-[11px] py-1.5 w-full rounded"
                      : "bg-white border border-border-subtle text-text-primary"
                  }`}
                >
                  {msg.sender === "user" || msg.sender === "system" ? msg.text : renderMarkdown(msg.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-border-subtle rounded-lg px-3.5 py-2 text-[12.5px] italic text-text-secondary flex items-center gap-1.5 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="border-t border-border-subtle p-3 flex gap-2 bg-white">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || !idToken}
              placeholder={!idToken ? "Sign in to talk to your coach..." : "Log a workout, ask for advice..."}
              className="flex-1 rounded-md border border-border-subtle px-3 py-2 text-[12.5px] text-text-primary focus:outline-none focus:border-text-primary disabled:bg-bg-primary/20"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !idToken}
              className="rounded-md border border-text-primary bg-text-primary text-[12px] font-semibold text-white px-4 py-2 hover:bg-[#2e2d27] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <Send className="h-3 w-3" /> Send
            </button>
          </form>
        </div>
      )}
    </>,
    document.body
  );
}
