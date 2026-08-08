export type Goal = "weight_loss" | "weight_gain" | "muscle_gain" | "maintenance";

export const GOAL_LABELS: Record<Goal, string> = {
  weight_loss: "Weight loss",
  weight_gain: "Weight gain",
  muscle_gain: "Muscle gain",
  maintenance: "Maintenance",
};

export function bmi(heightCm?: number | null, weightKg?: number | null) {
  if (!heightCm || !weightKg) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiBand(value: number | null) {
  if (value == null) return "—";
  if (value < 18.5) return "Underweight";
  if (value < 25) return "Healthy";
  if (value < 30) return "Overweight";
  return "Obese";
}

export type HabitLog = {
  log_date: string;
  meals: number;
  water_ml: number;
  workout_done: boolean;
  sleep_hours: number;
};

export function dayScore(log?: HabitLog | null) {
  if (!log) return 0;
  const meals = Math.min(log.meals / 3, 1) * 30;
  const water = Math.min(log.water_ml / 2500, 1) * 25;
  const workout = log.workout_done ? 25 : 0;
  const sleep = Math.min(Number(log.sleep_hours) / 7, 1) * 20;
  return Math.round(meals + water + workout + sleep);
}

/** Streak of consecutive days (ending today or yesterday) with a score >= 50. */
export function streak(logs: HabitLog[]) {
  const good = new Set(logs.filter((l) => dayScore(l) >= 50).map((l) => l.log_date));
  let count = 0;
  const cursor = new Date();
  if (!good.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (good.has(toDateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function fitnessScore(logs: HabitLog[], postureScore?: number | null) {
  const recent = logs.slice(0, 7);
  const habit = recent.length ? recent.reduce((s, l) => s + dayScore(l), 0) / recent.length : 0;
  const posture = postureScore ?? 60;
  return Math.round(habit * 0.75 + posture * 0.25);
}

export function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function weekStartKey(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return toDateKey(d);
}
