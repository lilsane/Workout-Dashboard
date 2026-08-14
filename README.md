# FitHub Coach

> Your personal AI strength coach, physiotherapist, workout journal, exercise encyclopedia, and health tracker — self-hosted, encrypted, and wired up to ChatGPT via a Custom GPT Action.

---

## ✨ Features

* 🩺 **Health Profile** — Personal details, body measurements (with history + auto-computed BMI), and permanent medical/injury conditions that are never forgotten and are factored into every recommendation.
* 🏋️ **Workout Log** — Log a session's exercises, sets, reps, weight, recovery status, and any pain — chronologically, forever. Muscle groups and estimated volume are derived automatically.
* 📚 **Exercise Encyclopedia** — Search any barbell, dumbbell, cable, machine, bodyweight, or physiotherapy movement for form cues, common mistakes, and alternatives. Identify an unfamiliar machine or exercise from a description or a photo (Gemini vision), with a safety check against your active conditions.
* 🧠 **Coach Intelligence** — Weekly training-balance analysis (push/pull, upper/lower, neglected & overtrained muscle groups) and a next-session recommendation that never repeats a heavy session on the same muscle group.
* 📝 **Scratchpad Notes** — A lightweight, auto-saving space for anything you want the coach to remember.
* 🤖 **AI Coach Integration** — A native in-app chat (Gemini function-calling) plus a built-in OpenAPI 3.1 schema (`/api/openapi.json`) for a ChatGPT Custom GPT Action — log a workout or ask for advice by just sending a text.

---

## 🛠 Tech Stack

* **Frontend Framework:** [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript + Tailwind CSS 4
* **Database & Auth:** [Firebase](https://firebase.google.com) (Google Sign-In + Firestore REST API — no admin SDK on the main data path)
* **AI:** Google Gemini (`gemini-2.5-flash`) for the in-app coach chat and exercise photo identification
* **Caching / Rate limiting:** Upstash Redis
* **AI Actions:** OpenAPI 3.1 spec, OAuth 2.0

---

## 🔒 Security Model

* **No master server credentials on the main data path.** Every Firestore call is routed through the [Firestore REST API](https://firebase.google.com/docs/firestore/use-rest-api), authenticated directly with your personal Firebase ID token. The one exception is the admin panel (metrics + encryption migration), which uses the Firebase Admin SDK and is gated by an admin-email check.
* **Database Encryption (AES-256-GCM).** Health conditions, workout notes, and pain descriptions are encrypted on the fly before hitting Firestore.
* **Enforced Database Rules.** Ownership checks in [`firestore.rules`](firestore.rules) guarantee only you can read or write your data.
* **Hardened API Routes.** All input is strictly validated (see `lib/validate.ts`) before it reaches the database.

---

## 🚀 Quickstart

### 1. Install

```bash
cd Workout-Dashboard
npm install
```

### 2. Set Up Firebase

1. Create a project at the [Firebase Console](https://console.firebase.google.com).
2. Enable **Google Sign-in** under **Authentication → Sign-in method**.
3. Create a **Firestore Database**.
4. **Project Settings → General → Add Web App**, copy the config snippet.
5. Deploy the security rules:

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project (or edit .firebaserc directly)
firebase deploy --only firestore:rules
```

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

At minimum, set:

```env
FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."}
ENCRYPTION_KEY="your-own-long-random-passphrase"
GEMINI_API_KEY="..."          # https://aistudio.google.com/apikey
NEXT_PUBLIC_ADMIN_EMAIL="you@example.com"
```

Upstash Redis (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) is optional locally but required for the ChatGPT OAuth flow, rate limiting, and GPT usage metrics — get a free database at [console.upstash.com](https://console.upstash.com).

> **Bring-your-own-config mode:** every credential above can also be supplied per-request via headers (`X-Firebase-Config`, etc.) instead of env vars — see `lib/credentials.ts`.

### 4. Run

```bash
npm run dev       # http://localhost:3000
npm run build && npm run start   # production
```

### 5. (Optional) Admin panel & encryption migration

Set `FIREBASE_SERVICE_ACCOUNT` (a service-account JSON, collapsed to one line) to enable `/admin` — GPT usage metrics, a Redis cache flush button, and a one-click re-encryption pass over every stored record. Only the account matching `NEXT_PUBLIC_ADMIN_EMAIL` can access it.

---

## 🤖 ChatGPT Custom GPT Setup

1. In ChatGPT: **Explore GPTs → Create → Configure → Actions**.
2. **Import Schema** from `https://your-domain.com/api/openapi.json`.
3. **Authentication → OAuth**:
   * Client ID / Secret: any placeholder string (e.g. `chatgpt-client` / `secret-123`)
   * Authorization URL: `https://your-domain.com/api/oauth/authorize`
   * Token URL: `https://your-domain.com/api/oauth/token`
   * Token Exchange Method: Default (POST request)
4. Paste the coach persona instructions from the in-app guide at `/assistant` into the GPT's Instructions field.
5. Save and start chatting — full step-by-step walkthrough (with a one-click copy of the schema URL, OAuth endpoints, and instructions) lives at `/assistant` once the app is running.

---

## 📁 Project Structure

```
app/                    Next.js App Router pages + API routes
  api/health-profile/   Personal details, measurements, conditions
  api/workouts/         Workout log CRUD
  api/exercises/        Encyclopedia search + AI identification
  api/coach/            Weekly analysis + next-workout recommendation
  api/assistant/chat/   In-app Gemini coach with function calling
  api/oauth/            Custom GPT OAuth 2.0 flow
  api/openapi.json/     OpenAPI 3.1 schema for Custom GPT Actions
  api/admin/            Admin-only metrics / cache-flush / encryption migration
components/dashboard/   Tab components (Overview, Health Profile, Workouts, ...)
lib/                    Data layer, auth, encryption, validation, coach analysis
```

---

## ⚠️ Disclaimer

This is a personal training tool, not a medical device. It never diagnoses with certainty and will tell you to see a doctor or physiotherapist when something sounds serious — but always use your own judgment and consult a professional for real medical concerns.

## 📜 License

MIT — fork it, break it, make it yours.
