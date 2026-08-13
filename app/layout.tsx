import type { Metadata } from "next";
import "./globals.css";
import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "strength coach",
    "workout tracker",
    "physiotherapy",
    "exercise encyclopedia",
    "training journal",
    "recovery tracker",
    "self-hosted dashboard",
    "ChatGPT custom GPT",
    "ChatGPT actions",
    "OpenAPI schema",
    "Firebase Firestore app",
  ],
  authors: [{ name: AUTHOR.name }],
  category: "health",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: false,
    follow: false,
  },
  manifest: "/manifest.webmanifest",
  formatDetection: { email: false, address: false, telephone: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
