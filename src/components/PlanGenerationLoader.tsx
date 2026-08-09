import { useEffect, useState } from "react";
import { Activity, Dumbbell, Salad, Sparkles } from "lucide-react";

const STATUS_MESSAGES = [
  "Analyzing your fitness goals…",
  "Calculating your nutrition targets…",
  "Building your personalized meals…",
  "Designing your workout routine…",
  "Optimizing your weekly schedule…",
  "Finalizing your fitness plan…",
];

const ICONS = [Activity, Salad, Salad, Dumbbell, Activity, Sparkles];

export function PlanGenerationLoader() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1 < STATUS_MESSAGES.length ? i + 1 : i));
    }, 3500);
    return () => window.clearInterval(id);
  }, []);

  const Icon = ICONS[index] ?? Sparkles;

  return (
    <section
      aria-busy="true"
      aria-label="Generating your personalized plan"
      className="surface-panel flex min-h-[26rem] flex-col items-center justify-center gap-8 rounded-xl px-6 py-14 text-center"
    >
      {/* Pulsing ring + icon */}
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-primary/15 blur-2xl motion-safe:animate-[pulse_2.6s_cubic-bezier(0.4,0,0.6,1)_infinite]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-primary/25 motion-safe:animate-[pulse_2.6s_cubic-bezier(0.4,0,0.6,1)_infinite]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-2 rounded-full border-2 border-primary/20 border-t-primary motion-safe:animate-spin"
          style={{ animationDuration: "1.4s" }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-6 rounded-full border border-primary/15 border-b-primary/60 motion-safe:animate-spin"
          style={{ animationDuration: "2.4s", animationDirection: "reverse" }}
        />
        <Icon key={index} className="relative h-8 w-8 text-primary motion-safe:animate-scale-in" />
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-3xl tracking-wide sm:text-4xl">Creating Your Personalized Plan</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground sm:text-base">
          Our AI is analyzing your goals, preferences, activity level, and requirements…
        </p>
      </div>

      {/* Indeterminate progress bar */}
      <div
        role="progressbar"
        aria-label="Plan generation in progress"
        aria-valuetext="In progress"
        className="relative h-2 w-full max-w-sm overflow-hidden rounded-full bg-secondary"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-primary/30 via-primary to-primary/30 motion-safe:animate-[plan-progress_1.6s_ease-in-out_infinite]"
        />
      </div>

      <p
        key={index}
        aria-live="polite"
        className="min-h-6 text-sm font-medium uppercase tracking-widest text-primary motion-safe:animate-fade-in"
      >
        {STATUS_MESSAGES[index]}
      </p>

      <p className="text-xs text-muted-foreground">This usually takes under a minute — keep this tab open.</p>
    </section>
  );
}
