import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Droplets, Dumbbell, Moon, Sparkles } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { bmi, bmiBand, dayScore, fitnessScore, streak, toDateKey, GOAL_LABELS, type Goal } from "@/lib/fitness";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Fitness Coach" },
      { name: "description", content: "Your weight, calories, streaks and fitness score at a glance." },
      { property: "og:title", content: "Dashboard — AI Fitness Coach" },
      { property: "og:description", content: "Track your fitness score, streaks and daily habits." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user!.id;
      const [profile, logs, analysis, plans] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase
          .from("habit_logs")
          .select("log_date,meals,water_ml,workout_done,sleep_hours")
          .eq("user_id", uid)
          .order("log_date", { ascending: false })
          .limit(30),
        supabase
          .from("body_analyses")
          .select("posture_score,posture_notes,bmi")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("plans").select("id,kind,title,content").eq("user_id", uid).eq("is_active", true),
      ]);
      return {
        profile: profile.data,
        logs: logs.data ?? [],
        analysis: analysis.data,
        plans: plans.data ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Dashboard">
        <p className="text-sm text-muted-foreground">Loading your numbers…</p>
      </AppShell>
    );
  }

  const { profile, logs, analysis, plans } = data;

  if (!profile?.onboarded) {
    return (
      <AppShell title="Welcome" subtitle="One quick setup and your AI plans are ready.">
        <div className="surface-panel rounded-xl p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-4 text-2xl">Let's analyze your body</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Add your stats, pick a goal and upload four photos. We run pose analysis in your browser and
            build your diet and workout plans from it.
          </p>
          <Button asChild className="mt-6">
            <Link to="/onboarding">Start onboarding</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const today = logs.find((l) => l.log_date === toDateKey(new Date()));
  const score = fitnessScore(logs, analysis?.posture_score ? Number(analysis.posture_score) : null);
  const currentStreak = streak(logs);
  const dietPlan = plans.find((p) => p.kind === "diet")?.content as
    | { daily_calories?: number; macros?: { protein_g?: number } }
    | undefined;
  const bmiValue = bmi(Number(profile.height_cm), Number(profile.weight_kg));

  return (
    <AppShell
      title={`Hey ${profile.display_name ?? "athlete"}`}
      subtitle={`Goal: ${GOAL_LABELS[(profile.goal ?? "maintenance") as Goal]}`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Fitness score" value={String(score)} hint="Habits + posture" accent />
        <Stat label="Streak" value={`${currentStreak} d`} hint="Consistent days" />
        <Stat label="Weight" value={`${profile.weight_kg ?? "—"} kg`} hint={`BMI ${bmiValue ?? "—"} · ${bmiBand(bmiValue)}`} />
        <Stat
          label="Calorie target"
          value={dietPlan?.daily_calories ? `${dietPlan.daily_calories}` : "—"}
          hint={dietPlan?.macros?.protein_g ? `${dietPlan.macros.protein_g}g protein` : "Generate a plan"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="surface-panel rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Today</h2>
            <Button asChild size="sm" variant="outline">
              <Link to="/tracker">Log habits</Link>
            </Button>
          </div>
          <Progress value={dayScore(today)} className="mt-4" />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Mini icon={Flame} label="Meals" value={`${today?.meals ?? 0}/3`} />
            <Mini icon={Droplets} label="Water" value={`${((today?.water_ml ?? 0) / 1000).toFixed(1)}L`} />
            <Mini icon={Dumbbell} label="Workout" value={today?.workout_done ? "Done" : "Pending"} />
            <Mini icon={Moon} label="Sleep" value={`${today?.sleep_hours ?? 0}h`} />
          </div>
        </div>

        <div className="surface-panel rounded-xl p-6">
          <h2 className="text-xl">Posture read</h2>
          <p className="mt-2 text-4xl text-primary">{analysis?.posture_score ? Number(analysis.posture_score) : "—"}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {analysis?.posture_notes ?? "Run a body analysis to see your posture findings."}
          </p>
          <Button asChild size="sm" variant="outline" className="mt-4">
            <Link to="/onboarding">Re-run analysis</Link>
          </Button>
        </div>
      </div>

      {plans.length === 0 && (
        <div className="surface-panel mt-6 rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground">You don't have an active plan yet.</p>
          <Button asChild className="mt-4">
            <Link to="/plan">Generate my plan</Link>
          </Button>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`surface-panel rounded-xl p-5 ${accent ? "glow-ring" : ""}`}>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-4xl ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Mini({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg">{value}</p>
    </div>
  );
}
