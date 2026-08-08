import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { coachReply } from "@/lib/coach.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "AI coach chat — AI Fitness Coach" },
      { name: "description", content: "Ask your AI coach about your plan, meals, form and progress." },
      { property: "og:title", content: "AI coach chat — AI Fitness Coach" },
      { property: "og:description", content: "Context-aware coaching grounded in your plan and habits." },
    ],
  }),
  component: Coach,
});

const SUGGESTIONS = [
  "Swap my lunch for something vegetarian",
  "How do I fix my shoulder tilt?",
  "Is my calorie target too aggressive?",
];

function Coach() {
  const queryClient = useQueryClient();
  const ask = useServerFn(coachReply);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: messages } = useQuery({
    queryKey: ["chat"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("chat_messages")
        .select("id,role,content,created_at")
        .eq("user_id", auth.user!.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    try {
      await ask({ data: { message } });
      await queryClient.invalidateQueries({ queryKey: ["chat"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The coach could not reply.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="AI coach" subtitle="Grounded in your body analysis, plan and recent habits.">
      <div className="surface-panel flex min-h-[60vh] flex-col rounded-xl p-6">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {(messages ?? []).length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Ask anything about your training or nutrition.</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} size="sm" variant="outline" onClick={() => send(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {(messages ?? []).map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "border border-border bg-secondary/40 text-foreground"
              }`}
            >
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Coach is thinking…
            </div>
          )}
        </div>

        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your coach…"
            maxLength={800}
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
