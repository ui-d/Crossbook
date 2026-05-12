"use client";

import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emailSchema = z.string().email();

export default function DeleteMyDataPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const parse = emailSchema.safeParse(email.trim());
    if (!parse.success) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/privacy/delete-my-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parse.data }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        sent?: boolean;
        error?: string;
        note?: string;
      };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Failed to send confirmation.");
        return;
      }
      setStatus("sent");
      setMessage(
        data.sent
          ? "Check your inbox. The confirmation link expires in 1 hour."
          : (data.note ?? "Request received."),
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "network error";
      setStatus("error");
      setMessage(msg);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">
        Delete my data
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Enter the email you used on Crossbook. We&apos;ll send a confirmation
        link that, when clicked, permanently deletes every report, decision,
        and free-tier record associated with that email.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={status === "sending"}>
          {status === "sending"
            ? "Sending…"
            : "Send confirmation email"}
        </Button>
        {message ? (
          <p
            className={
              status === "error"
                ? "text-destructive text-sm"
                : "text-sm text-muted-foreground"
            }
          >
            {message}
          </p>
        ) : null}
      </form>

      <p className="text-xs text-muted-foreground mt-8">
        Stripe customer + invoice records are retained per GDPR Art. 17(3)(b)
        for financial recordkeeping. Everything else is fully erased.
      </p>
    </main>
  );
}
