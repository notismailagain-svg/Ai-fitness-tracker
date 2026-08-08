import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { generatePlans } from "@/lib/coach.functions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "My plan — AI Fitness Coach" },
      { name: "description", content: "Your AI-generated diet plan and weekly workout split." },
      { property: "og:title", content: "My plan — AI Fitness Coach" },
      { property: "og:description", content: "Personalized meals, macros and training days." },
    ],
  }),
  component: PlanPage,
});

type DietContent = {
  daily_calories?: number;
  macros?: { protein_g?: number; carbs_g?: number; fat_g?: number };
  meals?: { name?: string; time?: string; items?: string[]; calories?: number }[];
  notes?: string;
};

type WorkoutContent = {
  split?: string;
  days?: { day?: string; focus?: string; exercises?: { name?: string; sets?: string; reps?: string }[] }[];
  notes?: string;
};

function PlanPage() {
  const queryClient = useQueryClient();
  const runGenerate = useServerFn(generatePlans);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: plans } = await supabase
        .from("plans")
        .select("id,kind,title,content,created_at")
        .eq("user_id", auth.user!.id)
        .eq("is_active", true);
      return plans ?? [];
    },
  });

  async function regenerate() {
    setBusy(true);
    try {
      await runGenerate({});
      await queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Fresh plans generated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate plans.");
    } finally {
      setBusy(false);
    }
  }

  const diet = data?.find((p) => p.kind === "diet");
  const workout = data?.find((p) => p.kind === "workout");
  const dietContent = diet?.content as DietContent | undefined;
  const workoutContent = workout?.content as WorkoutContent | undefined;

  return (
    <AppShell title="My plan" subtitle="Regenerate any time your body stats or goal change.">
      <div className="mb-6 flex justify-end">
        <Button onClick={regenerate} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {busy ? "Generating…" : "Regenerate plans"}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !diet && !workout ? (
        <div className="surface-panel rounded-xl p-8 text-center text-sm text-muted-foreground">
          No plan yet — hit “Regenerate plans” to build one from your latest body analysis.
        </div>
      ) : (
        <Tabs defaultValue="diet">
          <TabsList>
            <TabsTrigger value="diet">Diet</TabsTrigger>
            <TabsTrigger value="workout">Workout</TabsTrigger>
          </TabsList>

          <TabsContent value="diet" className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <Kpi label="Calories" value={dietContent?.daily_calories ? `${dietContent.daily_calories}` : "—"} />
              <Kpi label="Protein" value={`${dietContent?.macros?.protein_g ?? "—"} g`} />
              <Kpi label="Carbs" value={`${dietContent?.macros?.carbs_g ?? "—"} g`} />
              <Kpi label="Fat" value={`${dietContent?.macros?.fat_g ?? "—"} g`} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {(dietContent?.meals ?? []).map((meal, i) => (
                <div key={i} className="surface-panel rounded-xl p-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-lg">{meal.name}</h3>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">{meal.time}</span>
                  </div>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {(meal.items ?? []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {meal.calories && <p className="mt-3 text-sm text-primary">{meal.calories} kcal</p>}
                </div>
              ))}
            </div>
            {dietContent?.notes && <p className="text-sm text-muted-foreground">{dietContent.notes}</p>}
          </TabsContent>

          <TabsContent value="workout" className="mt-6 space-y-4">
            {workoutContent?.split && (
              <p className="text-sm uppercase tracking-widest text-primary">{workoutContent.split}</p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {(workoutContent?.days ?? []).map((day, i) => (
                <div key={i} className="surface-panel rounded-xl p-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-lg">{day.day}</h3>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">{day.focus}</span>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm">
                    {(day.exercises ?? []).map((ex, j) => (
                      <li key={j} className="flex justify-between gap-3 border-b border-border pb-1">
                        <span>{ex.name}</span>
                        <span className="text-muted-foreground">
                          {ex.sets} × {ex.reps}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {workoutContent?.notes && <p className="text-sm text-muted-foreground">{workoutContent.notes}</p>}
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-panel rounded-xl p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl text-primary">{value}</p>
    </div>
  );
}
