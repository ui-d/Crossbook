"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { saveBulkDecisionsAction } from "@/lib/decisions";
import type { ReportConflict } from "@/lib/report-builder";

type Decision =
  | "TRUST_HUBSPOT"
  | "TRUST_QUICKBOOKS"
  | "MANUAL_REVIEW"
  | "IGNORE";

interface BulkActionBarProps {
  reportId: string;
  conflicts: ReportConflict[];
  selectedIds: Set<string>;
  onSelect: (ids: Set<string>) => void;
  onCommit: (ids: string[], decision: Decision) => void;
  disabled: boolean;
  disabledHint?: string;
}

export function BulkActionBar({
  reportId,
  conflicts,
  selectedIds,
  onSelect,
  onCommit,
  disabled,
  disabledHint,
}: BulkActionBarProps) {
  const [pending, startTransition] = useTransition();
  const count = selectedIds.size;
  const visible = count >= 2 && !disabled;

  const ids = Array.from(selectedIds);

  const commitBulk = (decision: Decision) => {
    startTransition(async () => {
      const result = await saveBulkDecisionsAction({
        reportId,
        conflictIds: ids,
        decision,
      });
      if (result.ok) {
        onCommit(ids, decision);
        onSelect(new Set());
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
    <section className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase text-muted-foreground">Quick select</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={selectByPriority}
        >
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
        <div className="flex flex-wrap items-center gap-2 border-t pt-2">
          <span className="text-sm font-medium">
            {count} selected — apply:
          </span>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => commitBulk("TRUST_HUBSPOT")}
          >
            Trust HubSpot
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => commitBulk("TRUST_QUICKBOOKS")}
          >
            Trust QuickBooks
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => commitBulk("MANUAL_REVIEW")}
          >
            Flag for review
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => commitBulk("IGNORE")}
          >
            Ignore
          </Button>
        </div>
      ) : null}
      {disabled && disabledHint ? (
        <p className="text-xs text-muted-foreground">{disabledHint}</p>
      ) : null}
    </section>
  );
}
