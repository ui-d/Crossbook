"use client";

import { useMemo, useState } from "react";

import { BulkActionBar } from "@/components/BulkActionBar";
import { ConflictRow } from "@/components/ConflictRow";
import {
  ConflictFilters,
  applyFilters,
  emptyFilters,
  type FilterState,
} from "@/components/ConflictFilters";
import { saveDecisionAction } from "@/lib/decisions";
import type { ReportConflict } from "@/lib/report-builder";

type Decision =
  | "TRUST_HUBSPOT"
  | "TRUST_QUICKBOOKS"
  | "MANUAL_REVIEW"
  | "IGNORE";

interface SaveDecisionInput {
  reportId: string;
  conflictId: string;
  decision: Decision;
  notes: string | null;
}

interface SaveBulkInput {
  reportId: string;
  conflictIds: string[];
  decision: Decision;
}

export interface ConflictTableProps {
  reportId: string;
  conflicts: ReportConflict[];
  initialDecisions: Record<string, Decision>;
  isPaid: boolean;
  freeTierUnblurredLimit?: number;
  saveDecision?: (input: SaveDecisionInput) => Promise<{ ok: boolean; error?: string }>;
  saveBulk?: (input: SaveBulkInput) => Promise<{ ok: boolean; error?: string }>;
}

export function ConflictTable({
  reportId,
  conflicts,
  initialDecisions,
  isPaid,
  freeTierUnblurredLimit = 5,
  saveDecision,
  saveBulk,
}: ConflictTableProps) {
  const saveHandler = saveDecision ?? saveDecisionAction;
  const [filters, setFilters] = useState<FilterState>(emptyFilters());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [decisions, setDecisions] =
    useState<Record<string, Decision>>(initialDecisions);

  const filtered = useMemo(
    () =>
      isPaid
        ? applyFilters(conflicts, filters, decisions)
        : conflicts,
    [conflicts, filters, decisions, isPaid],
  );

  const toggleSelect = (conflictId: string) => {
    const next = new Set(selectedIds);
    if (next.has(conflictId)) next.delete(conflictId);
    else next.add(conflictId);
    setSelectedIds(next);
  };

  const applyDecision = (conflictId: string, decision: Decision) => {
    setDecisions((prev) => ({ ...prev, [conflictId]: decision }));
  };

  const handleBulkCommit = (ids: string[], decision: Decision) => {
    setDecisions((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = decision;
      return next;
    });
  };

  if (conflicts.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        No conflicts detected — your CSVs match up cleanly.
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Conflicts{" "}
          <span className="text-muted-foreground">
            ({filtered.length}
            {filtered.length !== conflicts.length ? `/${conflicts.length}` : ""}
            )
          </span>
        </h2>
      </header>

      <ConflictFilters
        conflicts={conflicts}
        state={filters}
        onChange={setFilters}
        disabled={!isPaid}
        disabledHint={
          !isPaid
            ? "Filters unlock with the $49/month plan."
            : undefined
        }
      />

      <BulkActionBar
        reportId={reportId}
        conflicts={conflicts}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        onCommit={handleBulkCommit}
        disabled={!isPaid}
        disabledHint={
          !isPaid
            ? "Bulk actions unlock with the $49/month plan."
            : undefined
        }
        saveBulk={saveBulk}
      />

      <div className="space-y-3">
        {filtered.map((conflict, index) => {
          const isBlurred = !isPaid && index >= freeTierUnblurredLimit;
          return (
            <ConflictRowWrapper
              key={conflict.conflict_id}
              reportId={reportId}
              conflict={conflict}
              initialDecision={decisions[conflict.conflict_id] ?? null}
              onDecisionApplied={applyDecision}
              selected={selectedIds.has(conflict.conflict_id)}
              onToggleSelect={() => toggleSelect(conflict.conflict_id)}
              selectable={isPaid}
              blurred={isBlurred}
              saveHandler={saveHandler}
            />
          );
        })}
      </div>
    </section>
  );
}

interface ConflictRowWrapperProps {
  reportId: string;
  conflict: ReportConflict;
  initialDecision: Decision | null;
  onDecisionApplied: (conflictId: string, decision: Decision) => void;
  selected: boolean;
  onToggleSelect: () => void;
  selectable: boolean;
  blurred: boolean;
  saveHandler: (input: SaveDecisionInput) => Promise<{ ok: boolean; error?: string }>;
}

function ConflictRowWrapper({
  reportId,
  conflict,
  initialDecision,
  onDecisionApplied,
  selected,
  onToggleSelect,
  selectable,
  blurred,
  saveHandler,
}: ConflictRowWrapperProps) {
  const saveWithCallback = async (input: SaveDecisionInput) => {
    const result = await saveHandler(input);
    if (result.ok) {
      onDecisionApplied(input.conflictId, input.decision);
    }
    return result;
  };

  return (
    <div className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        disabled={!selectable}
        className="mt-5 size-4 accent-primary disabled:opacity-30"
        aria-label="Select conflict"
      />
      <div className={blurred ? "flex-1 relative" : "flex-1"}>
        {blurred ? <BlurredOverlay /> : null}
        <ConflictRow
          reportId={reportId}
          conflict={conflict}
          initialDecision={initialDecision}
          saveDecision={saveWithCallback}
        />
      </div>
    </div>
  );
}

function BlurredOverlay() {
  return (
    <div className="absolute inset-0 z-10 rounded-md backdrop-blur-sm bg-background/60 flex items-center justify-center text-xs text-center px-4">
      <p>
        Upgrade to $49/month to view this conflict and the rest of the report.
      </p>
    </div>
  );
}
