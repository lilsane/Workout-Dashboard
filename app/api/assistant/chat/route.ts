import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { ApiError } from "@/lib/errors";
import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from "@google/generative-ai";
import {
  addHealthCondition,
  addMeasurementSnapshot,
  createWorkout,
  getHealthProfile,
  getNote,
  listWorkouts,
  updateHealthCondition,
  updateHealthProfile,
  updateNote,
} from "@/lib/firebase";
import { recommendNextWorkout, weeklyAnalysis } from "@/lib/coach";
import { searchExercises } from "@/lib/exerciseDatabase";
import { toLocalDateStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

// This is the persona from the coach's system prompt, condensed for a
// function-calling model: personal AI strength coach + physiotherapist +
// workout journal + exercise encyclopedia + health tracker that remembers
// the user's baseline and adapts every recommendation to it.
const SYSTEM_INSTRUCTION = `You are the user's personal AI Strength Coach, Physiotherapist, Workout Tracker, Recovery Coach, Exercise Identifier, and Health Assistant for the FitHub dashboard.

Your primary objective is to help them build strength and fitness safely, considering their medical conditions, injuries, current health, workout history, and recovery. Behave like a knowledgeable strength coach with sports-medicine awareness — never blindly recommend exercises; always check getHealthProfile and searchExercises' safety flag before recommending anything.

Core behaviors:
1. On a new conversation, call getHealthProfile to load their baseline (conditions, goals, experience) before giving any advice.
2. When they describe a gym session ("I went to gym", or just list exercises/sets/reps), call logWorkout with a structured entry. Infer workoutType and muscles from context if not stated. Ask only if genuinely ambiguous.
3. When they mention pain, injuries, or a diagnosis, call addHealthCondition (new) or updateHealthCondition (to resolve an existing one) — never let a mentioned condition go unrecorded, and never mark one resolved unless they explicitly say so.
4. When they mention body measurements or weight, call logMeasurementSnapshot.
5. When they ask "how was my week" or about training balance, call getWeeklyAnalysis and summarize frequency, push/pull and upper/lower balance, and neglected muscle groups plainly.
6. When they ask what to train next / today / tomorrow, call getNextWorkoutRecommendation and explain the reasoning, including any safety cautions returned.
7. When they name, describe, or ask about an exercise or machine, call searchExercises first; only fall back to your own knowledge if nothing matches, and always mention the safety flag relative to their conditions.
8. If they describe pain during/after a workout, identify likely muscles/tendons/joints affected, note severity, and clearly separate possibilities from confirmed facts. Never diagnose with certainty. If symptoms sound like a possible injury (sharp pain, numbness, radiating pain, joint instability), recommend a medical evaluation instead of pushing through.
9. Never recommend consecutive heavy sessions for the same muscle group.
10. If they missed workouts, never shame them — encourage consistency ("You missed two days, that's okay — let's restart today with a moderate session."). If they're consistent, acknowledge it plainly.
11. Prioritize safety over maximizing workload at all times.

Response format — write like a coach giving a real session recap, not a terse chat reply. The client renders full Markdown (headers, bold, bullet/numbered lists, tables, horizontal rules), so use it:
- Open with a one-line acknowledgment of what happened (use their name if known from the health profile), then a short "## <Emoji> <Title>" heading for the recap (e.g. "## 🏋️ Biceps Day Summary").
- Under it, list what was actually done as a checked/numbered list, each item bold on the exercise name with weight/reps.
- Add a "### 💡 Tips to Improve" (or "Notes", "Safety", etc. as relevant) section with a short bullet list — concrete, specific to what they just did, not generic filler.
- If there are safety-relevant conditions on file, add a short "Safety" callout explaining how their known conditions shape the advice.
- When recommending a next session, next weights, or a plan, use a Markdown table with columns like Exercise | Weight | Sets x Reps rather than prose.
- Close with one relevant, low-effort follow-up offer (e.g. "Want a full weekly plan built from this?") — never stack multiple questions.
- Keep it skimmable: short paragraphs, bold the key numbers/verdicts, use "---" to separate major sections when a reply has more than two of them. Don't pad with filler compliments; every section should carry information.

Stay focused on health/fitness/nutrition-adjacent topics for this user. For completely unrelated requests (general coding help, unrelated trivia, essay writing), reply exactly: "I can only help with your training, recovery, and health tracking here on FitHub." Never break this rule.`;

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "getHealthProfile",
    description: "Fetch the user's full health profile: personal details, measurements, medical conditions, fitness background.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
  {
    name: "updateHealthProfile",
    description: "Update any subset of personal/fitness-background fields (ageYears, heightCm, weightKg, sex, goal, experienceLevel, recoverySpeed, sportsPlayed, etc).",
    parameters: { type: SchemaType.OBJECT, properties: { patch: { type: SchemaType.OBJECT, description: "Object of fields to update.", properties: {} } }, required: ["patch"] },
  },
  {
    name: "addHealthCondition",
    description: "Record a new permanent medical/injury condition the user mentioned.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: { description: { type: SchemaType.STRING }, notes: { type: SchemaType.STRING } },
      required: ["description"],
    },
  },
  {
    name: "updateHealthCondition",
    description: "Resolve or edit an existing condition by id (fetch ids via getHealthProfile first).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: { id: { type: SchemaType.STRING }, resolved: { type: SchemaType.BOOLEAN }, notes: { type: SchemaType.STRING } },
      required: ["id"],
    },
  },
  {
    name: "logMeasurementSnapshot",
    description: "Log a body-measurement/weight snapshot for today or a given date.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: { type: SchemaType.STRING },
        weightKg: { type: SchemaType.NUMBER },
        waistCm: { type: SchemaType.NUMBER },
        chestCm: { type: SchemaType.NUMBER },
        bodyFatPercent: { type: SchemaType.NUMBER },
      },
    },
  },
  {
    name: "logWorkout",
    description: "Log a full workout session with workoutType and a list of exercises (name, muscles, sets: reps/weight/unit).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        workoutType: { type: SchemaType.STRING, description: "push, pull, legs, upper_body, lower_body, full_body, cardio, mobility, football, rehab, recovery, other" },
        exercises: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, description: "{ name, muscles: [], sets: [{reps, weight, unit}], notes }", properties: {} } },
        notes: { type: SchemaType.STRING },
        painDuringWorkout: { type: SchemaType.STRING },
        recoveryStatus: { type: SchemaType.STRING, description: "fresh, normal, fatigued, sore" },
      },
      required: ["workoutType", "exercises"],
    },
  },
  {
    name: "listWorkouts",
    description: "List recent workout sessions, optionally filtered by date range.",
    parameters: { type: SchemaType.OBJECT, properties: { from: { type: SchemaType.STRING }, to: { type: SchemaType.STRING }, limit: { type: SchemaType.INTEGER } } },
  },
  {
    name: "getWeeklyAnalysis",
    description: "Get training-balance analysis for the trailing window: frequency, push/pull & upper/lower balance, neglected/overtrained muscles.",
    parameters: { type: SchemaType.OBJECT, properties: { days: { type: SchemaType.INTEGER } } },
  },
  {
    name: "getNextWorkoutRecommendation",
    description: "Get the recommended next session type (rest/push/pull/legs/etc) based on recovery and recent training.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
  {
    name: "searchExercises",
    description: "Search the exercise encyclopedia by name, muscle group, category, or equipment. Always check the returned safety flag against the user's conditions.",
    parameters: { type: SchemaType.OBJECT, properties: { q: { type: SchemaType.STRING }, muscle: { type: SchemaType.STRING }, category: { type: SchemaType.STRING } } },
  },
  {
    name: "getCoachNotes",
    description: "Fetch the contents of the auto-saving scratchpad note.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
  {
    name: "updateCoachNotes",
    description: "Overwrite the entire content of the scratchpad note.",
    parameters: { type: SchemaType.OBJECT, properties: { content: { type: SchemaType.STRING } }, required: ["content"] },
  },
];

async function executeTool(session: any, name: string, args: any) {
  try {
    switch (name) {
      case "getHealthProfile":
        return await getHealthProfile(session);
      case "updateHealthProfile":
        await updateHealthProfile(session, args.patch || {});
        return await getHealthProfile(session);
      case "addHealthCondition":
        return { conditions: await addHealthCondition(session, { description: args.description, resolved: false, notes: args.notes ?? null }) };
      case "updateHealthCondition":
        return { conditions: await updateHealthCondition(session, args.id, { resolved: args.resolved, notes: args.notes }) };
      case "logMeasurementSnapshot":
        return { measurementHistory: await addMeasurementSnapshot(session, { date: args.date || toLocalDateStr(new Date()), weightKg: args.weightKg ?? null, waistCm: args.waistCm ?? null, chestCm: args.chestCm ?? null, bodyFatPercent: args.bodyFatPercent ?? null }) };
      case "logWorkout":
        return await createWorkout(session, {
          workoutType: args.workoutType,
          exercises: (args.exercises || []).map((e: any) => ({ name: e.name, muscles: e.muscles || [], sets: e.sets || [], notes: e.notes ?? null })),
          notes: args.notes ?? null,
          painDuringWorkout: args.painDuringWorkout ?? null,
          recoveryStatus: args.recoveryStatus ?? null,
        });
      case "listWorkouts":
        return await listWorkouts(session, { from: args.from, to: args.to, limit: args.limit || 20 });
      case "getWeeklyAnalysis": {
        const workouts = await listWorkouts(session, { limit: 200 });
        return weeklyAnalysis(workouts, args.days || 7, toLocalDateStr(new Date()));
      }
      case "getNextWorkoutRecommendation": {
        const [profile, workouts] = await Promise.all([getHealthProfile(session), listWorkouts(session, { limit: 60 })]);
        return recommendNextWorkout(workouts, profile, toLocalDateStr(new Date()));
      }
      case "searchExercises":
        return searchExercises(args.q, { category: args.category, muscle: args.muscle }).slice(0, 15);
      case "getCoachNotes": {
        const note = await getNote(session);
        return note || { content: "" };
      }
      case "updateCoachNotes":
        await updateNote(session, args.content);
        return { content: args.content };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return { error: err.message || "Failed to execute action" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);

    if (!redis) {
      return NextResponse.json({ error: "Rate limit cache offline." }, { status: 500 });
    }
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ error: "Server GEMINI_API_KEY is not configured." }, { status: 500 });
    }

    const uid = session.uid;
    const globalKey = "rate:gemini:global:minute";
    const userKey = `rate:gemini:user:${uid}:minute`;

    const globalCount = await redis.incr(globalKey);
    if (globalCount === 1) await redis.expire(globalKey, 60);
    if (globalCount > 15) {
      return NextResponse.json({ error: "The coach is busy right now. Please try again in a few seconds." }, { status: 429 });
    }

    const userCount = await redis.incr(userKey);
    if (userCount === 1) await redis.expire(userKey, 60);
    if (userCount > 5) {
      return NextResponse.json({ error: "You are sending messages too quickly. Please wait a minute." }, { status: 429 });
    }

    const body = await req.json();
    const { message, history = [] } = body;
    if (!message) {
      return NextResponse.json({ error: "Missing message query." }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations }],
    });

    const sdkHistory = history.map((h: any) => ({ role: h.role, parts: h.parts }));
    const chat = model.startChat({ history: sdkHistory });

    let response = await chat.sendMessage(message);
    let attempts = 0;

    while (attempts < 6) {
      const functionCalls = response.response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        const rawResult = await executeTool(session, call.name, call.args);
        const toolResult = rawResult && typeof rawResult === "object" && !Array.isArray(rawResult) ? rawResult : { result: rawResult };

        response = await chat.sendMessage([{ functionResponse: { name: call.name, response: toolResult } }]);
        attempts++;
      } else {
        const updatedHistory = await chat.getHistory();
        return NextResponse.json({ reply: response.response.text(), history: updatedHistory });
      }
    }

    throw new Error("Too many tool call iterations.");
  } catch (error: any) {
    console.error("Assistant Chat Error:", error);
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || "Failed to process chat query" }, { status: 500 });
  }
}
