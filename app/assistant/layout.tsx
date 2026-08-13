import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "AI Coach Integration",
  description: "Connect your private FitHub coach to ChatGPT Actions or another Action-compatible AI agent.",
  robots: { index: false, follow: false },
  openGraph: {
    title: `AI Coach Integration — ${SITE_NAME}`,
    description: "Connect your private FitHub coach to ChatGPT Actions or another Action-compatible AI agent.",
    type: "website",
  },
};

export default function AssistantLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
