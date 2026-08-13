import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { requireUser } from "@/lib/auth";
import { getHealthProfile } from "@/lib/firebase";
import { findExerciseByName } from "@/lib/exerciseDatabase";
import { redis } from "@/lib/redis";
import { ApiError, toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

// "You must identify any exercise in the world" — from a gym photo, a video
// frame, a partial description, or a mangled local-gym machine name. Falls
// back to the local encyclopedia first (fast, free, no vision call needed);
// only calls Gemini when nothing local matches or an image was supplied.
const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    exerciseName: { type: SchemaType.STRING },
    alternativeNames: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    primaryMuscles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    secondaryMuscles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    stabilizers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    difficulty: { type: SchemaType.STRING },
    properForm: { type: SchemaType.STRING },
    commonMistakes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    suitableAlternatives: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    formObservations: { type: SchemaType.STRING, description: "Only fill this in if an image was provided: body position, grip, joint angles, range of motion, and any visible form mistakes or safety concerns." },
    safetyAssessment: { type: SchemaType.STRING, description: "Whether this looks safe given the user's listed health conditions, and why." },
  },
  required: ["exerciseName", "primaryMuscles", "difficulty", "properForm", "safetyAssessment"],
};

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);

    if (!redis) return NextResponse.json({ error: "Rate limit cache offline." }, { status: 500 });
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) return NextResponse.json({ error: "Server GEMINI_API_KEY is not configured." }, { status: 500 });

    const userKey = `rate:identify:user:${session.uid}:minute`;
    const userCount = await redis.incr(userKey);
    if (userCount === 1) await redis.expire(userKey, 60);
    if (userCount > 8) {
      return NextResponse.json({ error: "Too many identification requests. Please wait a minute." }, { status: 429 });
    }

    let body: { description?: string; imageBase64?: string; imageMimeType?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No/empty body — falls through to the validation below.
    }
    const { description, imageBase64, imageMimeType } = body;
    if (!description && !imageBase64) throw new ApiError(400, "Provide a 'description' (text/gym name) or 'imageBase64' (a photo of the exercise/machine).");

    const profile = await getHealthProfile(session);

    // Fast path: a clean local match, and no image to analyze — skip the
    // model call entirely.
    if (description && !imageBase64) {
      const local = findExerciseByName(description);
      if (local) {
        return NextResponse.json({
          source: "local_encyclopedia",
          exerciseName: local.name,
          alternativeNames: local.aliases,
          primaryMuscles: local.primaryMuscles,
          secondaryMuscles: local.secondaryMuscles,
          stabilizers: local.stabilizers,
          difficulty: local.difficulty,
          properForm: local.formTips.join(" "),
          commonMistakes: local.commonMistakes,
          suitableAlternatives: local.alternatives,
          cautionFor: local.cautionFor,
        });
      }
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json", responseSchema: responseSchema as any },
    });

    const conditionsSummary = profile.conditions.filter((c) => !c.resolved).map((c) => c.description).join("; ") || "none on file";
    const promptText = `You are a strength & conditioning coach with sports-medicine awareness identifying an exercise for a client.
${description ? `They described/named it as: "${description}".` : "They uploaded a photo — identify the exercise/machine from the image."}
Their active health conditions: ${conditionsSummary}.

Identify the exercise (resolve local gym slang, machine brand names, or partial/incorrect names to the real exercise). Give primary/secondary/stabilizer muscles, difficulty, proper form cues, common mistakes, and 2-3 suitable alternatives. If an image was provided, also fill formObservations with body position, grip, joint angles, range of motion, and any visible mistakes or safety concerns. In safetyAssessment, explicitly say whether this exercise is safe given their listed conditions and why — never diagnose with certainty, just flag risk plainly.`;

    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [{ text: promptText }];
    if (imageBase64) {
      parts.push({ inlineData: { data: imageBase64.replace(/^data:[^,]+,/, ""), mimeType: imageMimeType || "image/jpeg" } });
    }

    const result = await model.generateContent(parts as any);
    const parsed = JSON.parse(result.response.text());
    return NextResponse.json({ source: "gemini", ...parsed });
  } catch (error) {
    return toErrorResponse(error, "POST /api/exercises/identify");
  }
}
