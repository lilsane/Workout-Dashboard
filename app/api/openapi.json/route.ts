import { NextRequest, NextResponse } from "next/server";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

// OpenAPI 3.1 schema consumed by ChatGPT Custom GPT Actions (and any other
// Action-compatible AI agent — Gemini Gems, Claude Projects, Poe bots) so it
// can act as the coach described in the system prompt: read/update the
// health profile, log workouts, search the exercise encyclopedia, identify
// exercises from a description or photo, and pull weekly coach analysis.
function buildSpec(origin: string) {
  const muscleEnum = [
    "chest", "back", "shoulders", "front_delts", "side_delts", "rear_delts",
    "biceps", "triceps", "forearms", "core", "lower_back",
    "glutes", "quads", "hamstrings", "calves", "neck", "cardio",
  ];
  const workoutTypeEnum = ["push", "pull", "legs", "upper_body", "lower_body", "full_body", "cardio", "mobility", "football", "rehab", "recovery", "other"];

  const errorResponse = {
    description: "Error",
    content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" }, message: { type: "string" } } } } },
  };

  return {
    openapi: "3.1.0",
    info: {
      title: `${SITE_NAME} Actions`,
      description: SITE_DESCRIPTION,
      version: "0.1.0",
    },
    servers: [{ url: origin }],
    paths: {
      "/api/health-profile": {
        get: {
          operationId: "getHealthProfile",
          summary: "Get the user's full health profile",
          description: "Personal details, body measurements, medical/injury conditions, and fitness background. Call this first in any new conversation so you know the user's baseline and injuries before recommending anything.",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          responses: { "200": { description: "Health profile", content: { "application/json": { schema: { type: "object", properties: {} } } } }, "401": errorResponse },
        },
        patch: {
          operationId: "updateHealthProfile",
          summary: "Update personal details or fitness-background fields",
          description: "Update any subset of personal/fitness-background fields (age, height, weight, sex, goal, experience level, favorite/disliked exercises, mobility limits, recovery speed, sports, steps, macros, sleep). Use whenever the user shares or corrects these facts.",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "Any subset of health profile fields to update.",
                  properties: {
                    ageYears: { type: "number" }, heightCm: { type: "number" }, weightKg: { type: "number" },
                    sex: { type: "string", enum: ["male", "female", "other"] },
                    dominantHand: { type: "string", enum: ["left", "right", "ambidextrous"] },
                    goal: { type: "string", enum: ["muscle_gain", "fat_loss", "strength", "athletic_performance", "rehabilitation", "combination"] },
                    experienceLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                    favoriteExercises: { type: "array", items: { type: "string" } },
                    dislikedExercises: { type: "array", items: { type: "string" } },
                    mobilityLimitations: { type: "array", items: { type: "string" } },
                    recoverySpeed: { type: "string", enum: ["slow", "average", "fast"] },
                    sportsPlayed: { type: "array", items: { type: "string" } },
                    footballFrequencyPerWeek: { type: "number" }, dailySteps: { type: "number" },
                    proteinIntakeG: { type: "number" }, waterIntakeL: { type: "number" }, sleepHours: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Updated profile", content: { "application/json": { schema: { type: "object", properties: {} } } } }, "400": errorResponse, "401": errorResponse },
        },
      },
      "/api/health-profile/measurements": {
        post: {
          operationId: "logMeasurementSnapshot",
          summary: "Log a body measurement snapshot",
          description: "Records weight and/or body measurements (waist, chest, arms, etc.) for a given date. BMI is recalculated automatically from height + weight.",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    date: { type: "string", description: "YYYY-MM-DD, defaults to today" },
                    weightKg: { type: "number" }, neckCm: { type: "number" }, chestCm: { type: "number" },
                    waistCm: { type: "number" }, hipCm: { type: "number" }, shoulderWidthCm: { type: "number" },
                    upperArmCm: { type: "number" }, forearmCm: { type: "number" }, thighCm: { type: "number" },
                    calfCm: { type: "number" }, wristCm: { type: "number" }, bodyFatPercent: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Full measurement history, newest first", content: { "application/json": { schema: { type: "object", properties: {} } } } }, "400": errorResponse, "401": errorResponse },
        },
      },
      "/api/health-profile/conditions": {
        post: {
          operationId: "addHealthCondition",
          summary: "Record a new permanent medical/injury condition",
          description: "Adds a condition (e.g. 'C4-C5 cervical disc herniation', 'morning shoulder pain') that must be remembered forever and factored into every future exercise recommendation, until explicitly resolved.",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["description"], properties: { description: { type: "string" }, notes: { type: "string" } } } } } },
          responses: { "200": { description: "Full condition list", content: { "application/json": { schema: { type: "object", properties: {} } } } }, "400": errorResponse, "401": errorResponse },
        },
      },
      "/api/health-profile/conditions/{id}": {
        patch: {
          operationId: "updateHealthCondition",
          summary: "Edit or resolve a health condition",
          description: "Set resolved=true only when the user explicitly says the condition has healed/resolved. Never resolve a condition on your own inference.",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { resolved: { type: "boolean" }, notes: { type: "string" }, description: { type: "string" } } } } } },
          responses: { "200": { description: "Full condition list", content: { "application/json": { schema: { type: "object", properties: {} } } } }, "400": errorResponse, "401": errorResponse, "404": errorResponse },
        },
        delete: {
          operationId: "deleteHealthCondition",
          summary: "Permanently remove a health condition record",
          description: "Only use this if the user explicitly asks to delete the record outright — prefer updateHealthCondition with resolved=true for conditions that healed, so the history is preserved.",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": true,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Full condition list", content: { "application/json": { schema: { type: "object", properties: {} } } } }, "401": errorResponse },
        },
      },
      "/api/workouts": {
        get: {
          operationId: "listWorkouts",
          summary: "List logged workout sessions",
          description: "Optionally filter by date range or workout type. Use this to answer questions about training history, or before computing your own weekly summary.",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          parameters: [
            { name: "from", in: "query", schema: { type: "string" }, description: "YYYY-MM-DD" },
            { name: "to", in: "query", schema: { type: "string" }, description: "YYYY-MM-DD" },
            { name: "workoutType", in: "query", schema: { type: "string", enum: workoutTypeEnum } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": { description: "Workout list", content: { "application/json": { schema: { type: "array", items: { type: "object", properties: {} } } } } }, "401": errorResponse },
        },
        post: {
          operationId: "logWorkout",
          summary: "Log a full workout session",
          description: "The 'I went to the gym' action. Provide workoutType and a list of exercises (each with sets: reps/weight/unit/rpe). musclesWorked and estimatedVolume are derived automatically if omitted. Record painDuringWorkout if the user mentions any pain, and recoveryStatus/exercisesMissed when known.",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["workoutType", "exercises"],
                  properties: {
                    date: { type: "string", description: "YYYY-MM-DD, defaults to today" },
                    workoutType: { type: "string", enum: workoutTypeEnum },
                    musclesWorked: { type: "array", items: { type: "string", enum: muscleEnum } },
                    exercises: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["name", "sets"],
                        properties: {
                          name: { type: "string" },
                          muscles: { type: "array", items: { type: "string", enum: muscleEnum } },
                          sets: { type: "array", items: { type: "object", properties: { reps: { type: "number" }, weight: { type: "number" }, unit: { type: "string", enum: ["kg", "lb"] }, rpe: { type: "number" } } } },
                          notes: { type: "string" },
                        },
                      },
                    },
                    intensity: { type: "string", enum: ["light", "moderate", "heavy"] },
                    notes: { type: "string" },
                    recoveryStatus: { type: "string", enum: ["fresh", "normal", "fatigued", "sore"] },
                    painDuringWorkout: { type: "string", description: "Describe any pain felt during the session, if any." },
                    exercisesMissed: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Created", content: { "application/json": { schema: { type: "object", properties: { id: { type: "string" } } } } } }, "400": errorResponse, "401": errorResponse },
        },
      },
      "/api/workouts/{id}": {
        patch: {
          operationId: "updateWorkout",
          summary: "Edit a previously logged workout",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "Any subset of workout fields to change.",
                  properties: {
                    date: { type: "string" },
                    workoutType: { type: "string", enum: workoutTypeEnum },
                    musclesWorked: { type: "array", items: { type: "string", enum: muscleEnum } },
                    exercises: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          muscles: { type: "array", items: { type: "string", enum: muscleEnum } },
                          sets: { type: "array", items: { type: "object", properties: { reps: { type: "number" }, weight: { type: "number" }, unit: { type: "string", enum: ["kg", "lb"] }, rpe: { type: "number" } } } },
                          notes: { type: "string" },
                        },
                      },
                    },
                    intensity: { type: "string", enum: ["light", "moderate", "heavy"] },
                    notes: { type: "string" },
                    recoveryStatus: { type: "string", enum: ["fresh", "normal", "fatigued", "sore"] },
                    painDuringWorkout: { type: "string" },
                    exercisesMissed: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Updated", content: { "application/json": { schema: { type: "object", properties: {} } } } }, "400": errorResponse, "401": errorResponse },
        },
        delete: {
          operationId: "deleteWorkout",
          summary: "Delete a logged workout",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": true,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Deleted", content: { "application/json": { schema: { type: "object", properties: {} } } } }, "401": errorResponse },
        },
      },
      "/api/exercises": {
        get: {
          operationId: "searchExercises",
          summary: "Search the exercise encyclopedia",
          description: "Look up an exercise by name/alias, muscle group, category, or equipment. Every result includes a safety flag computed against the user's current active health conditions — check it before recommending anything.",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          parameters: [
            { name: "q", in: "query", schema: { type: "string" } },
            { name: "muscle", in: "query", schema: { type: "string", enum: muscleEnum } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "equipment", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Matching exercises", content: { "application/json": { schema: { type: "array", items: { type: "object", properties: {} } } } } }, "401": errorResponse },
        },
      },
      "/api/exercises/identify": {
        post: {
          operationId: "identifyExercise",
          summary: "Identify an exercise from a description or photo",
          description: "Resolves local gym slang, machine brand names, partial descriptions, or a photo into the real exercise, with muscles worked, form cues, common mistakes, alternatives, and a safety assessment against the user's conditions.",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    description: { type: "string", description: "Text name/description of the exercise or machine." },
                    imageBase64: { type: "string", description: "Base64-encoded photo of the exercise/machine, no data: prefix required." },
                    imageMimeType: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Identification result", content: { "application/json": { schema: { type: "object", properties: {} } } } }, "400": errorResponse, "401": errorResponse },
        },
      },
      "/api/coach/weekly": {
        get: {
          operationId: "getWeeklyAnalysis",
          summary: "Get weekly training-balance analysis",
          description: "Session frequency, skipped days, push/pull and upper/lower balance, and neglected/overtrained muscle groups over the trailing window (default 7 days).",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          parameters: [{ name: "days", in: "query", schema: { type: "integer" }, description: "Trailing window size in days, default 7." }],
          responses: { "200": { description: "Weekly analysis", content: { "application/json": { schema: { type: "object", properties: {} } } } }, "401": errorResponse },
        },
      },
      "/api/coach/recommend": {
        get: {
          operationId: "getNextWorkoutRecommendation",
          summary: "Get today/tomorrow's recommended session type",
          description: "Recommends rest, cardio, push, pull, legs, full_body, mobility, football, or recovery based on recent training and recovery — never recommends training a muscle group on consecutive heavy days, and defers to recovery when recent pain was reported.",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          responses: { "200": { description: "Recommendation", content: { "application/json": { schema: { type: "object", properties: {} } } } }, "401": errorResponse },
        },
      },
      "/api/notes": {
        get: {
          operationId: "getCoachNotes",
          summary: "Get the scratchpad notes",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          responses: { "200": { description: "Note content", content: { "application/json": { schema: { type: "object", properties: { content: { type: "string" } } } } } }, "401": errorResponse },
        },
        patch: {
          operationId: "updateCoachNotes",
          summary: "Overwrite the scratchpad notes",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { content: { type: "string" } } } } } },
          responses: { "200": { description: "Updated", content: { "application/json": { schema: { type: "object", properties: {} } } } }, "401": errorResponse },
        },
      },
      "/api/settings": {
        get: {
          operationId: "getSettings",
          summary: "Get dashboard display preferences",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          responses: { "200": { description: "Settings", content: { "application/json": { schema: { type: "object", properties: {} } } } }, "401": errorResponse },
        },
        patch: {
          operationId: "updateSettings",
          summary: "Update dashboard display preferences (weightUnit, distanceUnit)",
          security: [{ bearerAuth: [] }],
          "x-openai-isConsequential": false,
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { weightUnit: { type: "string", enum: ["kg", "lb"] }, distanceUnit: { type: "string", enum: ["km", "mi"] } } } } } },
          responses: { "200": { description: "Updated settings", content: { "application/json": { schema: { type: "object", properties: {} } } } }, "401": errorResponse },
        },
      },
    },
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "FitHub permanent API key",
          description: "A Firebase refresh token issued by FitHub. Configure this action with API Key → Bearer authentication in ChatGPT.",
        },
      },
    },
  };
}

export async function GET(req: NextRequest) {
  const spec = buildSpec(req.nextUrl.origin);
  return NextResponse.json(spec);
}
