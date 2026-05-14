"use client";

import { useTransition } from "react";
import { Layers, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { saveBulkDecisionsAction } from "@/lib/decisions";
import type { ReportConflict } from "@/lib/report-builder";

type Decision =
  | "TRUST_HUBSPOT"
  | "TRUST_QUICKBOOKS"
  | "MANUAL_REVIEW"
  | "IGNORE";

interface BulkInput {
  reportId: string;
  conflictIds: string[];
  decision: Decision;
}

export interface BulkActionBarProps {
  reportId: string;
  conflicts: ReportConflict[];
  selectedIds: Set<string>;
  onSelect: (ids: Set<string>) => void;
  onCommit: (ids: string[], decision: Decision) => void;
  disabled: boolean;
  disabledHint?: string;
  saveBulk?: (input: BulkInput) => Promise<{ ok: boolean; error?: string }>;
}

export function BulkActionBar({
  reportId,
  conflicts,
  selectedIds,
  onSelect,
  onCommit,
  disabled,
  disabledHint,
  saveBulk,
}: BulkActionBarProps) {
  const bulkHandler = saveBulk ?? saveBulkDecisionsAction;
  const [pending, startTransition] = useTransition();
  const count = selectedIds.size;
  const visible = count >= 2 && !disabled;

  const ids = Array.from(selectedIds);

  const commitBulk = (decision: Decision) => {
    startTransition(async () => {
      const result = await bulkHandler({
        reportId,
        conflictIds: ids,
        decision,
      });
      if (result.ok) {
        onCommit(ids, decision);
        onSelect(new Set());
        track("decision_saved", {
          decision_type: decision,
          was_bulk: true,
        });
      }
    });
  };

  const selectByPriority = () => {
    const next = new Set(selectedIds);
    for (const c of conflicts) {
      if (c.priority === "HIGH") next.add(c.conflict_id);
    }
    onSelect(next);
  };

  const selectCurrencyFormat = () => {
    const next = new Set(selectedIds);
    for (const c of conflicts) {
      if (c.pattern_key === "currency_symbol_vs_code_mismatch") {
        next.add(c.conflict_id);
      }
    }
    onSelect(next);
  };

  return (
    <section className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label-caps text-on-surface-variant inline-flex items-center gap-1">
          <Zap className="size-3.5" /> Quick select
        </span>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={selectByPriority}>
          All HIGH priority
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={selectCurrencyFormat}
        >
          All currency-format mismatches
        </Button>
        {selectedIds.size > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => onSelect(new Set())}
          >
            Clear selection
          </Button>
        )}
      </div>
      {visible ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant pt-2">
          <span className="text-[13px] font-semibold text-on-surface inline-flex items-center gap-1">
            <Layers className="size-4 text-primary" />
            {count} selected — apply:
          </span>
          <Button type="button" size="sm" variant="cta" disabled={pending} onClick={() => commitBulk("TRUST_HUBSPOT")}>
            Trust HubSpot
          </Button>
          <Button type="button" size="sm" variant="cta" disabled={pending} onClick={() => commitBulk("TRUST_QUICKBOOKS")}>
            Trust QuickBooks
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => commitBulk("MANUAL_REVIEW")}>
            Flag for review
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => commitBulk("IGNORE")}>
            Ignore
          </Button>
        </div>
      ) : null}
      {disabled && disabledHint ? (
        <p className="text-[12px] text-on-surface-variant">{disabledHint}</p>
      ) : null}
    </section>
  );
}
