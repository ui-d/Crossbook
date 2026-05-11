"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { SourceCitation } from "@/components/SourceCitation";
import {
  formatAmount,
  type ReportConflict,
} from "@/lib/report-builder";
import { cn } from "@/lib/utils";

type Decision =
  | "TRUST_HUBSPOT"
  | "TRUST_QUICKBOOKS"
  | "MANUAL_REVIEW"
  | "IGNORE";

const PRIORITY_STYLES: Record<ReportConflict["priority"], string> = {
  HIGH: "bg-red-100 text-red-800 border-red-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const TYPE_STYLES: Record<ReportConflict["conflict_type"], string> = {
  AMOUNT: "bg-orange-100 text-orange-800",
  STATUS: "bg-blue-100 text-blue-800",
  MISSING: "bg-red-100 text-red-800",
  DUPLICATE: "bg-purple-100 text-purple-800",
  DATE: "bg-cyan-100 text-cyan-800",
  CURRENCY: "bg-indigo-100 text-indigo-800",
  EMAIL: "bg-slate-100 text-slate-800",
  NAME: "bg-pink-100 text-pink-800",
  TAX_ID: "bg-amber-100 text-amber-800",
};

interface ConflictRowProps {
  reportId: string;
  conflict: ReportConflict;
  initialDecision: Decision | null;
  saveDecision: (input: {
    reportId: string;
    conflictId: string;
    decision: Decision;
    notes: string | null;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export function ConflictRow({
  reportId,
  conflict,
  initialDecision,
  saveDecision,
}: ConflictRowProps) {
  const [decision, setDecision] = useState<Decision | null>(initialDecision);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const commit = (next: Decision) => {
    setError(null);
    startTransition(async () => {
      const res = await saveDecision({
        reportId,
        conflictId: conflict.conflict_id,
        decision: next,
        notes: notes.trim() || null,
      });
      if (res.ok) {
        setDecision(next);
      } else {
        setError(res.error ?? "Failed to save decision.");
      }
    });
  };

  return (
    <article
      className={cn(
        "rounded-md border bg-card p-4 transition",
        decision !== null ? "opacity-70" : null,
      )}
    >
      <header className="flex flex-wrap items-center gap-2 mb-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
            PRIORITY_STYLES[conflict.priority],
          )}
        >
          {conflict.priority}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            TYPE_STYLES[conflict.conflict_type],
          )}
        >
          {conflict.conflict_type}
        </span>
        {conflict.amount_at_risk_cents !== null ? (
          <span className="text-sm font-medium">
            {formatAmount(conflict.amount_at_risk_cents)} at risk
          </span>
        ) : null}
        <span className="ml-auto">
          <SourceCitation
            hubspotRowIndex={conflict.hubspot_row_index}
            quickbooksRowIndex={conflict.quickbooks_row_index}
          />
        </span>
      </header>

      <h3 className="font-medium text-sm">
        {conflict.hubspot_company ?? "—"}
        {conflict.quickbooks_company &&
        conflict.quickbooks_company !== conflict.hubspot_company
          ? ` → ${conflict.quickbooks_company}`
          : null}
      </h3>

      <p className="text-sm mt-1">{conflict.explanation}</p>

      {(conflict.hubspot_value || conflict.quickbooks_value) && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">HubSpot</div>
            <div className="font-mono">{conflict.hubspot_value ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">QuickBooks</div>
            <div className="font-mono">{conflict.quickbooks_value ?? "—"}</div>
          </div>
        </div>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional, exported in corrected CSV)"
        className="mt-3 w-full rounded-md border bg-background p-2 text-sm"
        rows={2}
        disabled={pending}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <DecisionButton
          label="Trust HubSpot"
          recommended={conflict.recommended_action === "TRUST_HUBSPOT"}
          active={decision === "TRUST_HUBSPOT"}
          disabled={pending}
          onClick={() => commit("TRUST_HUBSPOT")}
        />
        <DecisionButton
          label="Trust QuickBooks"
          recommended={conflict.recommended_action === "TRUST_QUICKBOOKS"}
          active={decision === "TRUST_QUICKBOOKS"}
          disabled={pending}
          onClick={() => commit("TRUST_QUICKBOOKS")}
        />
        <DecisionButton
          label="Flag for review"
          recommended={conflict.recommended_action === "MANUAL_REVIEW"}
          active={decision === "MANUAL_REVIEW"}
          disabled={pending}
          onClick={() => commit("MANUAL_REVIEW")}
        />
        <DecisionButton
          label="Ignore"
          recommended={conflict.recommended_action === "IGNORE"}
          active={decision === "IGNORE"}
          disabled={pending}
          onClick={() => commit("IGNORE")}
        />
      </div>

      {error ? (
        <p className="text-destructive text-xs mt-2">{error}</p>
      ) : null}
    </article>
  );
}

interface DecisionButtonProps {
  label: string;
  recommended: boolean;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}

function DecisionButton({
  label,
  recommended,
  active,
  disabled,
  onClick,
}: DecisionButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : recommended ? "secondary" : "outline"}
      disabled={disabled}
      onClick={onClick}
    >
      {recommended ? `★ ${label}` : label}
    </Button>
  );
}
