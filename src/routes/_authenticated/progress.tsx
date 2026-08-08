import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toDateKey } from "@/lib/fitness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — AI Fitness Coach" },
      { name: "description", content: "Log weekly weight check-ins and watch your trend line move." },
      { property: "og:title", content: "Progress — AI Fitness Coach" },
      { property: "og:description", content: "Weekly weight trend and check-in history." },
    ],
  }),
  component: ProgressPage,
});

function weekStart(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return toDateKey(d);
}

function ProgressPage() {
  const queryClient = useQueryClient();
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  const { data } = useQuery({
    queryKey: ["progress"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: entries } = await supabase
        .from("progress_entries")
        .select("id,week_start,weight_kg,insights")
        .eq("user_id", auth.user!.id)
        .order("week_start", { ascending: true });
      return { uid: auth.user!.id, entries: entries ?? [] };
    },
  });

  async function add() {
    if (!data || !weight) return;
    const { error } = await supabase.from("progress_entries").insert({
      user_id: data.uid,
      week_start: weekStart(new Date()),
      weight_kg: Number(weight),
      insights: notes || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("profiles").update({ weight_kg: Number(weight) }).eq("id", data.uid);
    setWeight("");
    setNotes("");
    await queryClient.invalidateQueries({ queryKey: ["progress"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("Check-in saved.");
  }

  const entries = data?.entries ?? [];
  const weights = entries.map((e) => Number(e.weight_kg)).filter((n) => Number.isFinite(n));
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const points = weights
    .map((w, i) => {
      const x = weights.length > 1 ? (i / (weights.length - 1)) * 100 : 0;
      const y = 100 - ((w - min) / (max - min || 1)) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <AppShell title="Progress" subtitle="Weigh in weekly at the same time of day for the cleanest trend.">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-panel space-y-4 rounded-xl p-6">
          <h2 className="text-xl">Weekly check-in</h2>
          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notes — optional</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} />
          </div>
          <Button onClick={add} disabled={!weight}>
            <Plus className="h-4 w-4" />
            Save check-in
          </Button>
        </div>

        <div className="surface-panel rounded-xl p-6 lg:col-span-2">
          <h2 className="text-xl">Weight trend</h2>
          {weights.length < 2 ? (
            <p className="mt-3 text-sm text-muted-foreground">Add at least two check-ins to see your trend.</p>
          ) : (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-4 h-48 w-full">
              <polyline
                points={points}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
          <div className="mt-4 flex justify-between text-xs text-muted-foreground">
            <span>{entries[0]?.week_start}</span>
            <span>{entries[entries.length - 1]?.week_start}</span>
          </div>
        </div>
      </div>

      <div className="surface-panel mt-6 rounded-xl p-6">
        <h2 className="text-xl">History</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <th className="pb-2">Week of</th>
              <th className="pb-2">Weight</th>
              <th className="pb-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {[...entries].reverse().map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="py-2">{e.week_start}</td>
                <td className="py-2">{e.weight_kg} kg</td>
                <td className="py-2">{e.insights ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
