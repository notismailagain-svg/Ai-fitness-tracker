import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Droplets, Dumbbell, Flame, Moon } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { dayScore, streak, toDateKey } from "@/lib/fitness";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/tracker")({
  head: () => ({
    meta: [
      { title: "Habit tracker — AI Fitness Coach" },
      { name: "description", content: "Log meals, water, workouts and sleep to build your streak." },
      { property: "og:title", content: "Habit tracker — AI Fitness Coach" },
      { property: "og:description", content: "Daily habit logging with streaks and completion scores." },
    ],
  }),
  component: Tracker,
});

function Tracker() {
  const queryClient = useQueryClient();
  const today = toDateKey(new Date());

  const { data } = useQuery({
    queryKey: ["habits"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: logs } = await supabase
        .from("habit_logs")
        .select("log_date,meals,water_ml,workout_done,sleep_hours")
        .eq("user_id", auth.user!.id)
        .order("log_date", { ascending: false })
        .limit(30);
      return { uid: auth.user!.id, logs: logs ?? [] };
    },
  });

  const todayLog = data?.logs.find((l) => l.log_date === today);
  const [meals, setMeals] = useState(0);
  const [water, setWater] = useState(0);
  const [workout, setWorkout] = useState(false);
  const [sleep, setSleep] = useState(0);

  useEffect(() => {
    if (!todayLog) return;
    setMeals(todayLog.meals ?? 0);
    setWater(todayLog.water_ml ?? 0);
    setWorkout(Boolean(todayLog.workout_done));
    setSleep(Number(todayLog.sleep_hours ?? 0));
  }, [todayLog]);

  async function save() {
    if (!data) return;
    const { error } = await supabase.from("habit_logs").upsert(
      {
        user_id: data.uid,
        log_date: today,
        meals,
        water_ml: water,
        workout_done: workout,
        sleep_hours: sleep,
      },
      { onConflict: "user_id,log_date" },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["habits"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("Logged for today.");
  }

  const score = dayScore({ meals, water_ml: water, workout_done: workout, sleep_hours: sleep });

  return (
    <AppShell title="Habit tracker" subtitle={`Streak: ${streak(data?.logs ?? [])} days`}>
      <div className="surface-panel rounded-xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Today · {today}</h2>
          <span className="font-display text-3xl text-primary">{score}%</span>
        </div>
        <Progress value={score} className="mt-3" />

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Control icon={Flame} label="Meals eaten">
            <Counter value={meals} onChange={setMeals} max={6} />
          </Control>
          <Control icon={Droplets} label="Water (ml)">
            <div className="flex gap-2">
              {[250, 500, 1000].map((amount) => (
                <Button key={amount} size="sm" variant="outline" onClick={() => setWater((w) => w + amount)}>
                  +{amount}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setWater(0)}>
                Reset
              </Button>
              <span className="ml-auto self-center text-sm text-muted-foreground">{water} ml</span>
            </div>
          </Control>
          <Control icon={Dumbbell} label="Workout">
            <Button variant={workout ? "default" : "outline"} size="sm" onClick={() => setWorkout((w) => !w)}>
              <Check className="h-4 w-4" />
              {workout ? "Completed" : "Mark complete"}
            </Button>
          </Control>
          <Control icon={Moon} label="Sleep (hours)">
            <Counter value={sleep} onChange={setSleep} max={12} />
          </Control>
        </div>

        <Button className="mt-6" onClick={save}>
          Save today's log
        </Button>
      </div>

      <div className="surface-panel mt-6 rounded-xl p-6">
        <h2 className="text-xl">Last 30 days</h2>
        <div className="mt-4 grid grid-cols-10 gap-2">
          {(data?.logs ?? []).map((log) => {
            const s = dayScore(log);
            return (
              <div
                key={log.log_date}
                title={`${log.log_date} · ${s}%`}
                className="aspect-square rounded-sm border border-border"
                style={{ backgroundColor: `color-mix(in oklab, var(--primary) ${s}%, transparent)` }}
              />
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function Control({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Flame;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-4">
      <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Counter({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <Button size="sm" variant="outline" onClick={() => onChange(Math.max(0, value - 1))}>
        −
      </Button>
      <span className="font-display text-2xl">{value}</span>
      <Button size="sm" variant="outline" onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </Button>
    </div>
  );
}
