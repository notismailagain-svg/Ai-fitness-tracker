import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ScanLine, Upload } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { analyzePhoto, type PoseResult } from "@/lib/pose";
import { generatePlans } from "@/lib/coach.functions";
import { bmi, GOAL_LABELS, type Goal } from "@/lib/fitness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Body analysis — AI Fitness Coach" },
      {
        name: "description",
        content: "Upload four photos for in-browser pose analysis, set your goal and get AI plans.",
      },
      { property: "og:title", content: "Body analysis — AI Fitness Coach" },
      { property: "og:description", content: "Posture detection, body landmarks and estimated BMI." },
    ],
  }),
  component: Onboarding;
});

const VIEWS = ["front", "back", "left", "right"] as const;
type View = (typeof VIEWS)[number];

function Onboarding() {
  const navigate = useNavigate();
  const runGenerate = useServerFn(generatePlans);

  const [step, setStep] = useState(0);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState<Goal>("weight_loss");
  const [activity, setActivity] = useState("moderate");
  const [equipment, setEquipment] = useState("home");
  const [allergies, setAllergies] = useState("");

  const [files, setFiles] = useState<Partial<Record<View, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<View, string>>>({});
  const [results, setResults] = useState<Partial<Record<View, PoseResult>>>({});
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);

  function pick(view: View, file?: File) {
    if (!file) return;
    setFiles((f) => ({ ...f, [view]: file }));
    setPreviews((p) => ({ ...p, [view]: URL.createObjectURL(file) }));
    setResults((r) => ({ ...r, [view]: undefined }));
  }

  async function runAnalysis() {
    const missing = VIEWS.filter((v) => !files[v]);
    if (missing.length) {
      toast.error(`Add all four photos (missing: ${missing.join(", ")}).`);
      return;
    }
    setScanning(true);
    try {
      const next: Partial<Record<View, PoseResult>> = {};
      for (const view of VIEWS) {
        const res = await analyzePhoto(files[view]!);
        if (!res) {
          toast.error(`No body detected in the ${view} photo. Use a full-body photo.`);
          setScanning(false);
          return;
        }
        next[view] = res;
      }
      setResults(next);
      toast.success("Pose analysis complete.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pose analysis failed.");
    } finally {
      setScanning(false);
    }
  }

  const scores = VIEWS.map((v) => results[v]?.score).filter((s): s is number => typeof s === "number");
  const postureScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const bmiValue = bmi(Number(height), Number(weight));

  async function finish() {
    if (!postureScore) {
      toast.error("Run the pose analysis first.");
      return;
    }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user!.id;

      const paths: Record<string, string> = {};
      for (const view of VIEWS) {
        const file = files[view]!;
        const path = `${uid}/${Date.now()}-${view}.jpg`;
        const { error } = await supabase.storage.from("body-photos").upload(path, file, { upsert: true });
        if (error) throw new Error(error.message);
        paths[view] = path;
      }

      const notes = Array.from(new Set(VIEWS.flatMap((v) => results[v]?.notes ?? []))).join(" ");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          age: Number(age) || null,
          sex,
          height_cm: Number(height) || null,
          weight_kg: Number(weight) || null,
          goal,
          activity_level: activity,
          equipment,
          allergies: allergies
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
          onboarded: true,
        })
        .eq("id", uid);
      if (profileError) throw new Error(profileError.message);

      const { error: analysisError } = await supabase.from("body_analyses").insert({
        user_id: uid,
        photo_paths: paths,
        landmarks: Object.fromEntries(
          VIEWS.map((v) => [v, results[v]?.landmarks?.map((l) => ({ x: l.x, y: l.y, z: l.z })) ?? []]),
        ),
        posture_score: postureScore,
        posture_notes: notes,
        bmi: bmiValue,
      });
      if (analysisError) throw new Error(analysisError.message);

      toast.info("Building your AI diet and workout plans…");
      await runGenerate({});
      toast.success("Your plans are ready.");
      navigate({ to: "/plan" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Body analysis" subtitle="Step-by-step onboarding — everything stays private to your account.">
      <div className="mb-6 flex gap-2">
        {["Your stats", "Photos & pose scan", "Review"].map((label, i) => (
          <div
            key={label}
            className={`flex-1 rounded-md border px-3 py-2 text-xs uppercase tracking-wide ${
              i === step ? "border-primary text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="surface-panel space-y-5 rounded-xl p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Age">
              <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
            </Field>
            <Field label="Sex">
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Height (cm)">
              <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
            </Field>
            <Field label="Weight (kg)">
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </Field>
            <Field label="Goal">
              <Select value={goal} onValueChange={(v) => setGoal(v as Goal)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GOAL_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Activity level">
              <Select value={activity} onValueChange={setActivity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary</SelectItem>
                  <SelectItem value="light">Lightly active</SelectItem>
                  <SelectItem value="moderate">Moderately active</SelectItem>
                  <SelectItem value="high">Very active</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Training location">
              <Select value={equipment} onValueChange={setEquipment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home (minimal equipment)</SelectItem>
                  <SelectItem value="gym">Full gym</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Allergies / foods to avoid (comma separated)">
            <Textarea value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="peanuts, lactose" />
          </Field>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Estimated BMI: {bmiValue ?? "—"}</p>
            <Button onClick={() => setStep(1)} disabled={!height || !weight}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VIEWS.map((view) => (
              <label
                key={view}
                className="surface-panel flex aspect-3/4 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl p-3 text-center"
              >
                {previews[view] ? (
                  <img src={previews[view]} alt={`${view} view`} className="h-full w-full object-cover" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-primary" />
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">{view} view</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pick(view, e.target.files?.[0])}
                />
              </label>
            ))}
          </div>

          <div className="surface-panel rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl">In-browser pose scan</h2>
                <p className="text-sm text-muted-foreground">
                  MediaPipe detects 33 body landmarks locally, then we score your alignment.
                </p>
              </div>
              <Button onClick={runAnalysis} disabled={scanning}>
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                {scanning ? "Scanning…" : "Run pose analysis"}
              </Button>
            </div>

            {postureScore && (
              <div className="mt-6 space-y-3">
                <p className="font-display text-3xl text-primary">Posture score {postureScore}</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {Array.from(new Set(VIEWS.flatMap((v) => results[v]?.notes ?? []))).map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={() => setStep(2)} disabled={!postureScore}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="surface-panel space-y-4 rounded-xl p-6">
          <h2 className="text-xl">Review</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Row label="Goal" value={GOAL_LABELS[goal]} />
            <Row label="Height / weight" value={`${height} cm · ${weight} kg`} />
            <Row label="Estimated BMI" value={String(bmiValue ?? "—")} />
            <Row label="Posture score" value={String(postureScore ?? "—")} />
            <Row label="Training" value={equipment === "gym" ? "Full gym" : "Home"} />
            <Row label="Avoiding" value={allergies || "nothing"} />
          </dl>
          <p className="text-xs text-muted-foreground">
            Image analysis is approximate and not medically certified.
          </p>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={finish} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Generating plans…" : "Generate my AI plans"}
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="text-base">{value}</dd>
    </div>
  );
}
