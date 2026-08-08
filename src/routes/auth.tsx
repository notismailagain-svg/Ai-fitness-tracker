import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Activity, ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AI Fitness Coach" },
      { name: "description", content: "Create your account or sign in to reach your AI-built diet and training plans." },
      { property: "og:title", content: "Sign in — AI Fitness Coach" },
      { property: "og:description", content: "Access your personalized AI diet and workout coaching." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: name },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setSent(true);
      return;
    }
    navigate({ to: "/onboarding", replace: true });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="grid-lines flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-primary">
          <Activity className="h-5 w-5" />
          <span className="font-display text-xl tracking-wider">AI Fitness Coach</span>
        </Link>

        <div className="surface-panel rounded-xl p-6">
          {sent ? (
            <div className="space-y-3 text-center">
              <h1 className="text-2xl">Check your inbox</h1>
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to {email}. Confirm it, then sign in to start your analysis.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form onSubmit={signIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-pass">Password</Label>
                    <Input
                      id="si-pass"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Signing in…" : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={signUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Name</Label>
                    <Input id="su-name" required value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pass">Password</Label>
                    <Input
                      id="su-pass"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Creating…" : "Create account"}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {!sent && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              <Button variant="outline" className="w-full" onClick={google}>
                Continue with Google
              </Button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          AI guidance only — not medical advice.
        </p>
      </div>
    </main>
  );
}
