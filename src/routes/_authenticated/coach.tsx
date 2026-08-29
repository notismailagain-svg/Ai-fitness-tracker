import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
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
  const inFlight = useRef(false);
  const [pendingUser, setPendingUser] = useState<string | null>(null);

  // Typewriter state for the newest assistant reply only.
  const [typingId, setTypingId] = useState<string | null>(null);
  const [typedCount, setTypedCount] = useState(0);
  const seenIds = useRef<Set<string> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  const list = messages ?? [];

  // Mark everything loaded before the first send as "already seen" (no animation).
  useEffect(() => {
    if (seenIds.current === null && messages) {
      seenIds.current = new Set(messages.map((m) => m.id));
    }
  }, [messages]);

  const typingMessage = typingId ? list.find((m) => m.id === typingId) : undefined;

  useEffect(() => {
    if (!typingMessage) return;
    const total = typingMessage.content.length;
    if (typedCount >= total) {
      setTypingId(null);
      return;
    }
    const id = window.setTimeout(() => {
      setTypedCount((c) => Math.min(total, c + Math.max(2, Math.round(total / 220))));
    }, 16);
    return () => window.clearTimeout(id);
  }, [typingMessage, typedCount]);

  // Scroll to bottom only on structural changes (new message, pending bubble,
  // typing start) — never on every typedCount tick, which caused a scroll loop.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [list.length, pendingUser, typingId]);

  // While the typewriter runs, follow along ONLY if the user is already
  // near the bottom; jump instantly (no smooth) to avoid animation churn.
  useEffect(() => {
    if (!typingId) return;
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [typedCount, typingId]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || inFlight.current) return;
    inFlight.current = true;
    setInput("");
    setBusy(true);
    setPendingUser(message);
    try {
      await ask({ data: { message } });
      const fresh = await queryClient.fetchQuery<typeof list>({ queryKey: ["chat"] });
      const last = [...(fresh ?? [])].reverse().find((m) => m.role === "assistant");
      if (last && !seenIds.current?.has(last.id)) {
        (fresh ?? []).forEach((m) => seenIds.current?.add(m.id));
        setTypedCount(0);
        setTypingId(last.id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The coach could not reply.");
    } finally {
      setPendingUser(null);
      setBusy(false);
      inFlight.current = false;
    }
  }

  return (
    <AppShell title="AI coach" subtitle="Grounded in your body analysis, plan and recent habits.">
      <div className="surface-panel flex h-[70vh] flex-col rounded-xl p-6">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto [scrollbar-gutter:stable]">
          {list.length === 0 && !pendingUser && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Ask anything about your training or nutrition.</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} size="sm" variant="outline" disabled={busy} onClick={() => void send(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {list.map((m) => {
            const isTyping = m.id === typingId;
            const content = isTyping ? m.content.slice(0, typedCount) : m.content;
            return (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm motion-safe:animate-plan-fade-slide-in ${
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "border border-border bg-secondary/40 text-foreground"
                }`}
              >
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              </div>
            );
          })}

          {pendingUser && (
            <div className="ml-auto max-w-[85%] rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground opacity-80">
              {pendingUser}
            </div>
          )}

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
            disabled={busy}
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
