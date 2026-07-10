import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { redeemRecoveryCode } from "@/lib/workouts.functions";

export const Route = createFileRoute("/recover")({
  component: Recover,
  head: () => ({
    meta: [
      { title: "Recover your account — US Miles Club" },
      {
        name: "description",
        content:
          "Lost access to your email? Use your recovery code to move your account to a new email address.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function Recover() {
  const redeem = useServerFn(redeemRecoveryCode);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [newEmailOut, setNewEmailOut] = useState<string>("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !code || !newEmail) {
      setError("Fill in every field.");
      return;
    }
    setStatus("sending");
    try {
      const res = await redeem({ data: { email, code, newEmail } });
      setNewEmailOut(res.newEmail);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card">
        <div className="mb-2 flex items-center gap-2 text-primary">
          <ShieldCheck size={20} strokeWidth={2} />
          <span className="text-sm font-bold uppercase tracking-wide">Account recovery</span>
        </div>
        <h1 className="text-3xl font-black">Recover your account</h1>
        <p className="mt-2 text-text-secondary">
          Enter the email tied to your account, the recovery code you saved on sign-up,
          and the new email you want to use going forward.
        </p>

        {status === "done" ? (
          <div className="mt-6 rounded-lg border border-border bg-muted p-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 size={20} />
              <span className="font-bold">Email updated</span>
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              Your account email is now{" "}
              <span className="mono">{newEmailOut}</span>. Head to sign-in and request
              a magic link at your new address. Your old recovery code has been
              retired — generate a new one after signing in.
            </p>
            <Link to="/auth" className="btn btn-primary mt-4 w-full">
              Go to sign-in
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
            <div>
              <label className="field-label" htmlFor="rec-email">Old email (the one you lost access to)</label>
              <input
                id="rec-email"
                type="email"
                autoComplete="email"
                required
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="old@example.com"
                disabled={status === "sending"}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="rec-code">Recovery code</label>
              <input
                id="rec-code"
                type="text"
                required
                autoComplete="off"
                className="field-input mono tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                disabled={status === "sending"}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="rec-new">New email</label>
              <input
                id="rec-new"
                type="email"
                autoComplete="email"
                required
                className="field-input"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@example.com"
                disabled={status === "sending"}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={status === "sending"}>
              {status === "sending" ? "Verifying…" : "Recover my account"}
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-text-secondary">
          Recovery codes are single-use. After a successful recovery you'll get a
          fresh code the next time you visit your portal. Head back to{" "}
          <Link to="/auth" className="underline text-foreground">sign-in</Link>.
        </p>
      </div>
    </div>
  );
}
