# 🏋️ FitHub Coach

### Your workouts. Your progress. Your personal AI coach.

FitHub Coach is a workout tracker that **remembers what you do**.

Log your workouts, keep track of your progress, see which muscle groups you've been neglecting, explore exercises, and ask your AI coach what you should train next.

You can use the dashboard normally, but the **easiest way to use FitHub Coach is through the Custom GPT**.

---

## 🤖 Start Here — Use the Custom GPT

**Recommended for most people:** use the ready-to-use FitHub Coach Custom GPT.

You can talk to it like you would talk to a personal trainer:

> "I did chest today — bench press 10 kg, 3 sets of 10, and incline press 7.5 kg, 3 sets of 12."

> "What did I train this week?"

> "Which muscles have I been neglecting?"

> "What should I train today?"

> "Log today's workout."

> "I don't know the name of this exercise." *(send a photo)*

The Custom GPT connects to your FitHub Coach dashboard, so you can interact with your workout history naturally instead of filling out forms every time.

**👉 Ready-to-use Custom GPT:**
`chatgpt.com/g/g-6a75ccc772dc819183897e74cd75e7ba-fithub-dashboard`

> **You don't need to set up anything if you just want to use the ready-made GPT.**

---

## 🌐 What is FitHub Coach?

FitHub Coach is built around a simple idea:

**Your workout history should actually help you decide what to do next.**

Instead of simply recording:

> "Bench press — 10 kg — 3 × 10"

FitHub Coach can look at your previous training and help answer:

* What have I trained recently?
* Which muscle groups am I missing?
* Am I training something too often?
* What should I train next?
* How has my strength changed?
* What exercises can I use instead?
* What should I be careful with based on my limitations?

It combines a traditional workout dashboard with an AI coach that can actually remember your training history.

---

# ✨ What Can It Do?

## 🏋️ Track Your Workouts

Record:

* Exercises
* Sets
* Reps
* Weight
* Recovery
* Pain or discomfort
* Other notes

Your workout history stays organized so you don't have to remember what you did weeks ago.

Muscle groups and estimated training volume are calculated from your logged exercises.

---

## 📈 Track Your Progress

Look back at your previous sessions and see how your training has changed over time.

Instead of wondering:

> "What weight did I use last time?"

you can simply ask the coach.

---

## 🧠 Find What You're Neglecting

FitHub Coach looks at your training history and helps identify areas that may be getting too little attention.

It can look at things such as:

* Push vs pull
* Upper vs lower body
* Muscle-group frequency
* Training volume
* Recently trained muscles
* Neglected areas
* Potentially overworked areas

It can then suggest what might make sense for your next session.

---

## 📚 Explore Exercises

Don't know the name of an exercise?

Describe it.

Or send a photo.

FitHub Coach can help identify exercises and provide:

* Form cues
* Common mistakes
* Alternatives
* Muscle groups involved
* Exercise variations

This also works for gym machines, cables, dumbbells, barbells, bodyweight movements, and physiotherapy-style exercises.

---

## 🩺 Keep Your Limitations in Mind

You can add relevant health conditions, injuries, pain, and physical limitations to your profile.

These can then be considered when generating training suggestions.

**Important:** FitHub Coach is not a doctor or physiotherapist. Its health-related suggestions are informational and should not replace professional medical advice.

---

## 📝 Keep Personal Notes

The built-in scratchpad lets you keep notes that you want your coach to remember.

For example:

* "Increase bench weight when 12 reps becomes comfortable."
* "Left shoulder feels uncomfortable during this movement."
* "Try a different grip next time."
* "Gym was crowded today."

---

# 🌐 Use the Dashboard

You can also use the full web dashboard if you prefer a visual interface.

**👉 Live Dashboard:** fithub-dashboard.vercel.app

The dashboard gives you access to your:

* Health profile
* Workout history
* Exercise encyclopedia
* Training analysis
* Coach recommendations
* Notes
* AI assistant

---

# 🚀 Recommended Way to Use FitHub Coach

If you're new, don't worry about setting up anything complicated.

### 1. Open the Custom GPT

Start with the ready-to-use FitHub Coach GPT.

### 2. Set up your profile

Tell the coach about your basic details, measurements, and any relevant limitations.

### 3. Log your workouts

After every workout, simply tell the coach what you did.

For example:

> "Back day today. Lat pulldown 25 kg 3×10, seated row 20 kg 3×12, face pulls 5 kg 3×15."

### 4. Ask questions whenever you want

You can ask:

> "What should I train today?"

> "What have I neglected this week?"

> "Am I training my shoulders too much?"

> "Show me alternatives to lat pulldowns."

### 5. Let the history build up

The more workouts you record, the more useful the training analysis becomes.

---

# 🧑‍💻 Want to Run Your Own Copy?

If you're a developer or want complete control over your data, you can host your own version of FitHub Coach.

The project is open source and can be run locally or deployed to your own infrastructure.

---

## 🛠 Tech Stack

* **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
* **Database & Authentication:** Firebase / Firestore
* **AI:** Google Gemini
* **Caching & Rate Limiting:** Upstash Redis
* **AI Integration:** OpenAPI 3.1 + OAuth 2.0

You don't need to understand these technologies to use FitHub Coach.

The sections below are mainly for people who want to run or modify their own copy.

---

# 🚀 Running Your Own Copy

## 1. Clone the Repository

```bash
git clone https://github.com/lilsane/Workout-Dashboard.git
cd Workout-Dashboard
```

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Create a Firebase Project

Create a project using the Firebase Console.

Then:

1. Enable **Google Sign-in** under **Authentication → Sign-in method**.
2. Create a **Firestore Database**.
3. Go to **Project Settings → General**.
4. Add a Web App.
5. Copy the Firebase configuration.

---

## 4. Configure Environment Variables

Create a `.env.local` file in the project root.

At minimum, configure:

```env
FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."}

ENCRYPTION_KEY="your-own-long-random-passphrase"

GEMINI_API_KEY="..."

NEXT_PUBLIC_ADMIN_EMAIL="you@example.com"
```

If you want to use the ChatGPT OAuth integration, rate limiting, and GPT usage metrics, configure Upstash Redis as well:

```env
UPSTASH_REDIS_REST_URL="..."

UPSTASH_REDIS_REST_TOKEN="..."
```

### ⚠️ Never commit `.env.local`

Your `.env.local` file can contain secrets.

Do **not** upload it to GitHub.

---

## 5. Configure Firestore

Install the Firebase CLI if you don't already have it:

```bash
npm install -g firebase-tools
```

Log in:

```bash
firebase login
```

Select your Firebase project:

```bash
firebase use --add
```

Then deploy the Firestore rules:

```bash
firebase deploy --only firestore:rules
```

---

## 6. Start the Dashboard

For development:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

For a production build:

```bash
npm run build
npm run start
```

---

# 🤖 Set Up Your Own Custom GPT

If you are running your own hosted version and want to connect it to ChatGPT:

### 1. Open ChatGPT

Go to:

**Explore GPTs → Create → Configure → Actions**

### 2. Import the API Schema

Use:

```text
https://your-domain.com/api/openapi.json
```

Replace `your-domain.com` with the domain where your FitHub Coach instance is hosted.

### 3. Configure OAuth

Use the following endpoints:

```text
Authorization URL:
https://your-domain.com/api/oauth/authorize

Token URL:
https://your-domain.com/api/oauth/token
```

Set the token exchange method to:

```text
Default (POST request)
```

### 4. Add the Coach Instructions

The dashboard includes an assistant setup page at:

```text
/assistant
```

This provides the information required to configure the Custom GPT.

### 5. Save the GPT

Once configured, you can use ChatGPT to interact with your own FitHub Coach instance.

---

# 🔐 Security & Privacy

FitHub Coach is designed with personal workout and health-related information in mind.

### Authentication

Users authenticate through Firebase.

### Data Ownership

Firestore rules enforce ownership checks so users can only access their own data.

### Encryption

Sensitive information such as health conditions, workout notes, and pain descriptions is encrypted using **AES-256-GCM** before being stored.

### API Validation

Incoming API data is validated before reaching the database.

### Server Credentials

The main data path uses the Firestore REST API with the authenticated user's Firebase ID token rather than relying on a master database credential.

An admin-only area exists separately for administrative operations such as metrics, cache management, and encryption migration.

---

# 📁 Project Structure

```text
app/
├── api/
│   ├── health-profile/     Personal details, measurements & conditions
│   ├── workouts/           Workout logging
│   ├── exercises/          Exercise search & identification
│   ├── coach/              Training analysis & recommendations
│   ├── assistant/chat/     In-app AI coach
│   ├── oauth/              Custom GPT authentication
│   ├── openapi.json/       Custom GPT Action schema
│   └── admin/              Admin functionality
│
components/
└── dashboard/              Dashboard interface components
│
hooks/                      React hooks
│
lib/
└── Data layer, authentication,
    encryption, validation & coach logic
│
types/                      TypeScript types
│
public/                     Static assets
```

---

# 🤖 How the AI Works

FitHub Coach uses Google Gemini for its in-app AI features.

The AI can be used for things such as:

* Workout-related conversations
* Training analysis
* Exercise identification
* Exercise explanations
* Training recommendations

The ChatGPT integration works through an **OpenAPI 3.1 Action** connected to the FitHub Coach API.

This means you can interact with your workout data through natural conversation instead of manually navigating the dashboard.

---

# 🗺️ Project Architecture

At a high level:

```text
                    ┌──────────────────┐
                    │   ChatGPT GPT    │
                    └────────┬─────────┘
                             │
                       OAuth + Actions
                             │
                             ▼
┌──────────────┐      ┌───────────────┐
│   Dashboard  │ ───► │ FitHub Coach  │
│   Next.js    │      │   API Routes  │
└──────────────┘      └───────┬───────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
            Firebase       Gemini       Upstash
            Firestore        AI           Redis
```

---

# ⚠️ Disclaimer

FitHub Coach is a **personal training and workout tracking tool**, not a medical device.

AI-generated recommendations can be wrong or incomplete.

Do not use FitHub Coach to diagnose injuries, illnesses, or medical conditions.

If you have significant or persistent pain, an injury, or another medical concern, consult an appropriately qualified healthcare professional.

---

# 📜 License

MIT License.

Feel free to fork the project, modify it, and make it your own.
