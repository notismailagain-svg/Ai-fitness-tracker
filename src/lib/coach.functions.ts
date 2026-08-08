import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function callAi(messages: ChatMessage[], jsonMode = false) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured yet.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (res.status === 429) throw new Error("The coach is busy right now. Please try again shortly.");
  if (res.status === 402) throw new Error("AI credits are exhausted. Please top up to continue.");
  if (!res.ok) throw new Error(`AI request failed (${res.status}).`);

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

function parseJson<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 ? cleaned.slice(start, end + 1) : cleaned) as T;
}

const profileSummary = (p: Record<string, unknown>, analysis?: Record<string, unknown> | null) =>
  [
    `Age: ${p["age"] ?? "unknown"}`,
    `Sex: ${p["sex"] ?? "unknown"}`,
    `Height: ${p["height_cm"] ?? "unknown"} cm`,
    `Weight: ${p["weight_kg"] ?? "unknown"} kg`,
    `Goal: ${p["goal"] ?? "unknown"}`,
    `Activity level: ${p["activity_level"] ?? "unknown"}`,
    `Training location: ${p["equipment"] ?? "home"}`,
    `Allergies / foods to avoid: ${((p["allergies"] as string[]) ?? []).join(", ") || "none"}`,
    analysis
      ? `Posture score: ${analysis["posture_score"] ?? "n/a"}; notes: ${analysis["posture_notes"] ?? "n/a"}; estimated BMI: ${analysis["bmi"] ?? "n/a"}`
      : "No body analysis yet.",
  ].join("\n");

export const generatePlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (!profile) throw new Error("Complete your profile first.");

    const { data: analysis } = await supabase
      .from("body_analyses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const summary = profileSummary(profile as Record<string, unknown>, analysis as Record<string, unknown> | null);

    const dietRaw = await callAi(
      [
        {
          role: "system",
          content:
            "You are a certified nutrition coach. Return STRICT JSON only, no prose. Never include foods the user is allergic to. Add a short safety note that this is not medical advice.",
        },
        {
          role: "user",
          content: `Build a one-day repeatable diet plan for this client.\n${summary}\n\nJSON shape:\n{"title":string,"daily_calories":number,"macros":{"protein_g":number,"carbs_g":number,"fat_g":number},"meals":[{"name":string,"time":string,"calories":number,"items":[string],"notes":string}],"hydration_ml":number,"safety_note":string}`,
        },
      ],
      true,
    );

    const workoutRaw = await callAi(
      [
        {
          role: "system",
          content:
            "You are a strength & conditioning coach. Return STRICT JSON only, no prose. Respect the training location (home = minimal equipment). Consider posture findings when choosing mobility work.",
        },
        {
          role: "user",
          content: `Build a weekly workout split for this client.\n${summary}\n\nJSON shape:\n{"title":string,"split":string,"days":[{"day":string,"focus":string,"exercises":[{"name":string,"sets":number,"reps":string,"rest":string}],"notes":string}],"weekly_cardio":string,"safety_note":string}`,
        },
      ],
      true,
    );

    const diet = parseJson<{ title: string }>(dietRaw);
    const workout = parseJson<{ title: string }>(workoutRaw);

    await supabase.from("plans").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);

    const { error } = await supabase.from("plans").insert([
      {
        user_id: userId,
        kind: "diet",
        title: diet.title || "Personalized diet plan",
        content: diet as never,
      },
      {
        user_id: userId,
        kind: "workout",
        title: workout.title || "Personalized workout plan",
        content: workout as never,
      },
    ]);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const coachReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ message: z.string().trim().min(1).max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: plans }, { data: habits }, { data: history }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("plans").select("kind,title,content").eq("user_id", userId).eq("is_active", true),
      supabase
        .from("habit_logs")
        .select("log_date,meals,water_ml,workout_done,sleep_hours")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(7),
      supabase
        .from("chat_messages")
        .select("role,content")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(30),
    ]);

    await supabase.from("chat_messages").insert({ user_id: userId, role: "user", content: data.message });

    const context_block = [
      "CLIENT PROFILE:",
      profile ? profileSummary(profile as Record<string, unknown>) : "unknown",
      "",
      "ACTIVE PLANS:",
      JSON.stringify(plans ?? []).slice(0, 6000),
      "",
      "LAST 7 DAYS OF TRACKING:",
      JSON.stringify(habits ?? []),
    ].join("\n");

    const reply = await callAi([
      {
        role: "system",
        content: `You are the user's personal AI fitness coach. Answer using their own plan and tracking data below. Be concise, practical and encouraging. Use markdown. You are not a doctor: refuse medical diagnosis and recommend a professional for health concerns.\n\n${context_block}`,
      },
      ...(history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: data.message },
    ]);

    await supabase.from("chat_messages").insert({ user_id: userId, role: "assistant", content: reply });

    return { reply };
  });

export const weeklyInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ entryId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: entries }, { data: habits }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("progress_entries")
        .select("week_start,weight_kg")
        .eq("user_id", userId)
        .order("week_start", { ascending: true }),
      supabase
        .from("habit_logs")
        .select("log_date,meals,water_ml,workout_done,sleep_hours")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(14),
    ]);

    const insights = await callAi([
      {
        role: "system",
        content:
          "You are a fitness progress analyst. In 3 short markdown bullets, describe the trend, one thing working, and one concrete adjustment. No medical claims.",
      },
      {
        role: "user",
        content: `Profile:\n${profile ? profileSummary(profile as Record<string, unknown>) : "unknown"}\n\nWeight history: ${JSON.stringify(entries ?? [])}\n\nRecent tracking: ${JSON.stringify(habits ?? [])}`,
      },
    ]);

    const { error } = await supabase
      .from("progress_entries")
      .update({ insights })
      .eq("id", data.entryId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    return { insights };
  });
