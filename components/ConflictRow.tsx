"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SourceCitation } from "@/components/SourceCitation";
import { track } from "@/lib/analytics";
import { formatAmount, type ReportConflict } from "@/lib/report-builder";
import { cn } from "@/lib/utils";

type Decision =
  | "TRUST_HUBSPOT"
  | "TRUST_QUICKBOOKS"
  | "MANUAL_REVIEW"
  | "IGNORE";

// Neutral badge for low-signal types — visible edge, calm fill.
const NEUTRAL_BADGE = "bg-bg-tint text-fg ring-1 ring-hairline";

const PRIORITY_STYLES: Record<ReportConflict["priority"], string> = {
  HIGH: "bg-danger-soft text-danger",
  MEDIUM: "bg-warning-soft text-warning",
  LOW: NEUTRAL_BADGE,
};

const TYPE_STYLES: Record<ReportConflict["conflict_type"], string> = {
  AMOUNT: "bg-accent-soft text-accent",
  STATUS: "bg-warning-soft text-warning",
  MISSING: "bg-danger-soft text-danger",
  DUPLICATE: NEUTRAL_BADGE,
  DATE: NEUTRAL_BADGE,
  CURRENCY: "bg-accent-soft text-accent",
  EMAIL: NEUTRAL_BADGE,
  NAME: NEUTRAL_BADGE,
  TAX_ID: "bg-warning-soft text-warning",
};

// Priority-keyed left accent stripe — the primary row-separation device.
const PRIORITY_STRIPE: Record<ReportConflict["priority"], string> = {
  HIGH: "border-l-danger",
  MEDIUM: "border-l-warning",
  LOW: "border-l-hairline",
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
        track("decision_saved", {
          decision_type: next,
          was_bulk: false,
        });
      } else {
        setError(res.error ?? "Failed to save decision.");
      }
    });
  };

  return (
    <article
      className={cn(
        "bg-surface-container-lowest border border-outline-variant border-l-4 rounded-xl shadow-card overflow-hidden transition-colors",
        decision !== null ? "border-l-success" : PRIORITY_STRIPE[conflict.priority],
      )}
    >
      <header className="flex flex-wrap items-center gap-2 px-6 py-4 border-b border-outline-variant bg-surface-container-low">
        <span
          className={cn(
            "inline-flex items-center text-label-caps px-2 py-1 rounded",
            PRIORITY_STYLES[conflict.priority],
          )}
        >
          {conflict.priority}
        </span>
        <span
          className={cn(
            "inline-flex items-center text-label-caps px-2 py-1 rounded",
            TYPE_STYLES[conflict.conflict_type],
          )}
        >
          {conflict.conflict_type}
        </span>
        {decision !== null ? (
          <span className="inline-flex items-center text-label-caps px-2 py-1 rounded bg-success-soft text-success">
            Decided
          </span>
        ) : null}
        {conflict.amount_at_risk_cents !== null ? (
          <span className="text-data-mono text-on-surface font-semibold">
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

      <div className="px-6 py-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-[16px] font-semibold text-on-surface">
            {conflict.hubspot_company ?? "—"}
            {conflict.quickbooks_company &&
            conflict.quickbooks_company !== conflict.hubspot_company
              ? ` → ${conflict.quickbooks_company}`
              : null}
          </h3>
          <p className="text-[14px] text-on-surface-variant leading-relaxed">
            {conflict.explanation}
          </p>
        </div>

        {(conflict.hubspot_value || conflict.quickbooks_value) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-surface-container-low border border-outline-variant rounded-lg p-2">
              <div className="text-label-caps text-accent mb-1">HubSpot</div>
              <div className="font-mono text-[13px] text-on-surface break-all">{conflict.hubspot_value ?? "—"}</div>
            </div>
            <div className="bg-surface-container-low border border-outline-variant rounded-lg p-2">
              <div className="text-label-caps text-on-surface-variant mb-1">QuickBooks</div>
              <div className="font-mono text-[13px] text-on-surface break-all">{conflict.quickbooks_value ?? "—"}</div>
            </div>
          </div>
        )}

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional, exported in corrected CSV)"
          rows={2}
          disabled={pending}
        />

        <div className="flex flex-wrap gap-2">
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

        {error ? <p className="text-error text-[13px]">{error}</p> : null}
      </div>
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
      variant={active ? "cta" : recommended ? "secondary" : "outline"}
      disabled={disabled}
      onClick={onClick}
      className="gap-1"
    >
      {recommended ? <Star className="size-3 fill-current" /> : null}
      {label}
    </Button>
  );
}
