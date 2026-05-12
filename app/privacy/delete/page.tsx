"use client";

import { useState } from "react";
import { z } from "zod";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SiteFooter from "@/components/SiteFooter";

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
    <>
      <main className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl shadow-ambient p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="size-10 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
              <Trash2 className="size-5" />
            </div>
            <h1 className="font-display text-[24px] font-bold tracking-tight text-on-surface">
              Delete my data
            </h1>
            <p className="text-[14px] text-on-surface-variant">
              Enter the email you used on Crossbook. We&apos;ll send a confirmation link that, when clicked,
              permanently deletes every report, decision, and free-tier record associated with that email.
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
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
            <Button type="submit" variant="cta" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Send confirmation email"}
            </Button>
            {message ? (
              <p
                className={
                  status === "error"
                    ? "text-error text-[13px]"
                    : "text-[13px] text-on-surface-variant"
                }
              >
                {message}
              </p>
            ) : null}
          </form>

          <p className="text-[12px] text-on-surface-variant/80 border-t border-outline-variant pt-4">
            Stripe customer + invoice records are retained per GDPR Art. 17(3)(b) for financial
            recordkeeping. Everything else is fully erased.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
