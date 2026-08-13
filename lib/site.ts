// Single source of truth for site identity — metadata, JSON-LD, and the
// OpenAPI spec all read from here so the production URL never drifts out of
// sync. Edit these once you know your deployment domain.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const SITE_NAME = "FitHub Dashboard";
export const SITE_TAGLINE = "Your personal strength coach, physiotherapist, and training journal.";
export const SITE_DESCRIPTION =
  "A private, self-hosted training companion that remembers your injuries, tracks every workout, and adapts every recommendation to your body — wired up to ChatGPT via a Custom GPT Action.";

export const AUTHOR = {
  name: "Personal Instance",
  url: SITE_URL,
  email: "",
  github: "",
};
