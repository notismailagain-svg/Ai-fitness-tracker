import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ScanLine, Salad, Dumbbell, MessageSquare, LineChart } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Fitness Coach — Photo-based diet & workout plans" },
      {
        name: "description",
        content:
          "Upload four photos, get in-browser posture analysis and AI-built diet and workout plans with habit tracking.",
      },
      { property: "og:title", content: "AI Fitness Coach — Photo-based diet & workout plans" },
      {
        property: "og:description",
        content: "Body analysis, personalized nutrition, training splits and an AI coach in one dark, focused app.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ScanLine, title: "4-photo body scan", body: "Pose landmarks detected in your browser — photos never leave your account." },
  { icon: Salad, title: "AI diet plan", body: "Calorie and macro targets with meals built around your allergies." },
  { icon: Dumbbell, title: "Workout split", body: "Home or gym programming matched to your goal and posture findings." },
  { icon: MessageSquare, title: "AI coach chat", body: "Answers grounded in your own plan, analysis and recent habits." },
  { icon: LineChart, title: "Habits & progress", body: "Meals, water, workouts, sleep — streaks and a weekly weight trend." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 text-primary">
          <Activity className="h-5 w-5" />
          <span className="font-display text-lg tracking-wider">AI Fitness Coach</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Body analysis · Nutrition · Training</p>
        <h1 className="mt-5 text-5xl leading-tight md:text-7xl">
          Your body, <span className="text-gradient-lime">analyzed</span>. Your plan, automated.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground">
          Four photos and a few stats are all it takes. We score your posture on-device, then generate a diet and
          workout plan you can actually follow — with an AI coach that knows your numbers.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Start free analysis</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">I already have an account</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="surface-panel rounded-xl p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-xl">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        AI guidance is approximate and not a substitute for medical advice.
      </footer>
    </div>
  );
}
