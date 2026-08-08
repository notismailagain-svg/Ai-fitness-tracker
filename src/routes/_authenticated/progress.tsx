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
      { name: "description", content: "Log weight and measurements and watch your trend line move." },
      { property: "og:title", content: "Progress — AI Fitness Coach" },
      { property: "og:description", content: "Weight trend and body measurement history." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const queryClient = useQueryClient();
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");

  const { data } = useQuery({
    queryKey: ["progress"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: entries } = await supabase
        .from("progress_entries")
        .select("id,entry_date,weight_kg,waist_cm")
        .eq("user_id", auth.user!.id)
        .order("entry_date", { ascending: true });
      return { uid: auth.user!.id, entries: entries ?? [] };
    },
  });

  async function add() {
    if (!data || !weight) return;
    const { error } = await supabase.from("progress_entries").upsert(
      {
        user_id: data.uid,
        entry_date: toDateKey(new Date()),
        weight_kg: Number(weight),
        waist_cm: waist ? Number(waist) : null,
      },
      { onConflict: "user_id,entry_date" },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("profiles").update({ weight_kg: Number(weight) }).eq("id", data.uid);
    setWeight("");
    setWaist("");
    await queryClient.invalidateQueries({ queryKey: ["progress"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("Progress saved.");
  }

  const entries = data?.entries ?? [];
  const weights = entries.map((e) => Number(e.weight_kg)).filter((n) => Number.isFinite(n));
  const min = Math.min(...weights, 0);
  const max = Math.max(...weights, 1);
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
          <h2 className="text-xl">New entry</h2>
          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Waist (cm) — optional</Label>
            <Input type="number" value={waist} onChange={(e) => setWaist(e.target.value)} />
          </div>
          <Button onClick={add} disabled={!weight}>
            <Plus className="h-4 w-4" />
            Save entry
          </Button>
        </div>

        <div className="surface-panel rounded-xl p-6 lg:col-span-2">
          <h2 className="text-xl">Weight trend</h2>
          {weights.length < 2 ? (
            <p className="mt-3 text-sm text-muted-foreground">Add at least two entries to see your trend.</p>
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
            <span>{entries[0]?.entry_date}</span>
            <span>{entries[entries.length - 1]?.entry_date}</span>
          </div>
        </div>
      </div>

      <div className="surface-panel mt-6 rounded-xl p-6">
        <h2 className="text-xl">History</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <th className="pb-2">Date</th>
              <th className="pb-2">Weight</th>
              <th className="pb-2">Waist</th>
            </tr>
          </thead>
          <tbody>
            {[...entries].reverse().map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="py-2">{e.entry_date}</td>
                <td className="py-2">{e.weight_kg} kg</td>
                <td className="py-2">{e.waist_cm ? `${e.waist_cm} cm` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
