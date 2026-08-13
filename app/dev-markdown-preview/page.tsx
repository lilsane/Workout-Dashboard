"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SAMPLE = `That's a **solid start**, John 💪 — especially since it's your first (or early) biceps day.
Don't worry about switching to **2.5 kg** for hammer curls — that's completely normal when you're building base strength.

## 🏆 Your Biceps Day Summary (Monday)

1. **Bicep curl:** 2.5 kg → 5 kg
2. **Hammer curl:** 5 kg (partial) → 2.5 kg
3. **Incline dumbbell raise**
4. **Cable curl**
5. **Wrist curl:** 2.5 kg

That's actually a complete **arm isolation session** (biceps + forearms). 👋

---

### 💡 Tips to Improve

- **Progress slowly**: Stay with 2.5 kg–5 kg until your form is solid. Quality > Quantity.
- **Hammer curl strength** improves a bit slower — it targets the *brachialis* muscle, which needs consistency.
- **Rest 60–90 sec** between sets.

---

### 🔁 For Next Biceps Session

| Exercise | Weight | Sets x Reps |
|---|---|---|
| Bicep Curl | 5 kg | 3x10 |
| Hammer Curl | 2.5 kg | 3x12 |
| Incline Dumbbell Curl | 2.5-5 kg | 3x10 |
| Cable Curl | Light-Moderate | 3x12 |
| Wrist Curl | 2.5 kg | 3x15 |

Would you like me to make a **weekly gym plan (Mon–Sat)** that includes all muscle groups with progressive load?
`;

export default function MarkdownPreview() {
  return (
    <div className="min-h-screen bg-[#faf9f5] p-10 flex justify-center">
      <div className="w-96 bg-white border border-border-subtle rounded-card shadow-lg p-4">
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
          {SAMPLE}
        </ReactMarkdown>
      </div>
    </div>
  );
}
