import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Mail, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SearchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: Auth,
  head: () => ({
    meta: [
      { title: "Sign in — US Miles Club" },
      {
        name: "description",
        content: "Sign in with a magic link to log workouts and manage your mileage.",
      },
    ],
  }),
});

function Auth() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [alreadyIn, setAlreadyIn] = useState<boolean>(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setAlreadyIn(true);
    });
  }, []);

  useEffect(() => {
    if (alreadyIn) {
      navigate({ to: redirect === "/portal" ? "/portal" : "/portal", replace: true });
    }
  }, [alreadyIn, navigate, redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setStatus("sending");
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/portal`,
        shouldCreateUser: true,
      },
    });
    if (err) {
      setStatus("error");
      setError(err.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card">
        <div className="mb-2 flex items-center gap-2 text-primary">
          <Mail size={20} strokeWidth={2} />
          <span className="text-sm font-bold uppercase tracking-wide">Magic link sign-in</span>
        </div>
        <h1 className="text-3xl font-black">Access the Club</h1>
        <p className="mt-2 text-text-secondary">
          We'll email you a one-tap sign-in link. No passwords, no hassle. Your browser stays
          signed in until you sign out.
        </p>

        {status === "sent" ? (
          <div className="mt-6 rounded-lg border border-border bg-muted p-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 size={20} />
              <span className="font-bold">Check your inbox</span>
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              We sent a sign-in link to <span className="mono">{email}</span>. Open it on this
              device to finish signing in.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="btn btn-ghost mt-3"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
            <div>
              <label className="field-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                inputMode="email"
                className="field-input"
                aria-invalid={!!error}
                aria-describedby={error ? "email-error" : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={status === "sending"}
              />
              {error && (
                <p id="email-error" className="mt-1 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={status === "sending"}>
              {status === "sending" ? "Sending link…" : "Send me a magic link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-text-secondary">
          Lost access to your email?{" "}
          <Link to="/recover" className="underline text-foreground">
            Use your recovery code
          </Link>
          . Or head back to the{" "}
          <Link to="/" className="underline text-foreground">
            map
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
