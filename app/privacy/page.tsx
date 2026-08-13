import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-primary px-5 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <Link href="/" className="text-[13px] font-medium text-text-secondary hover:text-text-primary">← Back to dashboard</Link>
        <h1 className="text-2xl font-bold tracking-[-0.5px]">Privacy</h1>
        <div className="flex flex-col gap-4 text-[13px] leading-relaxed text-text-secondary">
          <p>{SITE_NAME} is a self-hosted, single-tenant application. There is no shared backend and no third party operating this instance on your behalf — it runs against your own Firebase project.</p>
          <p><strong className="text-text-primary">Data storage.</strong> Health conditions, workout notes, and pain descriptions are encrypted with AES-256-GCM before being written to Firestore. Every database read/write is authenticated with your own Firebase ID token, so Firestore security rules (not this server) enforce that only you can read or write your data.</p>
          <p><strong className="text-text-primary">AI processing.</strong> When you use the in-app coach chat or the exercise photo identifier, your message/image and the relevant parts of your health data are sent to Google&apos;s Gemini API to generate a response. Nothing is stored by this app beyond what you explicitly log.</p>
          <p><strong className="text-text-primary">ChatGPT / Custom GPT Actions.</strong> If you connect a Custom GPT, it authenticates via OAuth using your own Firebase account and can only access your data, scoped by the same security rules as the dashboard.</p>
          <p><strong className="text-text-primary">Medical disclaimer.</strong> This tool is not a medical device and does not provide medical diagnoses. Always consult a doctor or physiotherapist for diagnosis, treatment, and before starting any new exercise program, especially with an existing injury or condition.</p>
        </div>
      </div>
    </div>
  );
}
