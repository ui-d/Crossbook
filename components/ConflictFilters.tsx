"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReportConflict } from "@/lib/report-builder";
import { cn } from "@/lib/utils";

export type Priority = ReportConflict["priority"];
export type ConflictTypeFilter = ReportConflict["conflict_type"];

export interface FilterState {
  priorities: Set<Priority>;
  conflictTypes: Set<ConflictTypeFilter>;
  companyQuery: string;
  decisionStatus: "ALL" | "PENDING" | "DECIDED";
}

export const emptyFilters = (): FilterState => ({
  priorities: new Set<Priority>(),
  conflictTypes: new Set<ConflictTypeFilter>(),
  companyQuery: "",
  decisionStatus: "ALL",
});

const PRIORITIES: Priority[] = ["HIGH", "MEDIUM", "LOW"];

interface ConflictFiltersProps {
  conflicts: ReportConflict[];
  state: FilterState;
  onChange: (state: FilterState) => void;
  disabled: boolean;
  disabledHint?: string;
}

export function ConflictFilters({
  conflicts,
  state,
  onChange,
  disabled,
  disabledHint,
}: ConflictFiltersProps) {
  const availableTypes = useMemo<ConflictTypeFilter[]>(() => {
    const set = new Set<ConflictTypeFilter>();
    for (const c of conflicts) set.add(c.conflict_type);
    return Array.from(set).sort();
  }, [conflicts]);

  const togglePriority = (priority: Priority) => {
    const next = new Set(state.priorities);
    if (next.has(priority)) next.delete(priority);
    else next.add(priority);
    onChange({ ...state, priorities: next });
  };

  const toggleType = (type: ConflictTypeFilter) => {
    const next = new Set(state.conflictTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onChange({ ...state, conflictTypes: next });
  };

  return (
    <fieldset
      disabled={disabled}
      className={cn(
        "rounded-md border bg-card p-3 space-y-3 text-sm",
        disabled ? "opacity-60" : null,
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase text-muted-foreground">Priority</span>
        {PRIORITIES.map((p) => (
          <FilterPill
            key={p}
            active={state.priorities.has(p)}
            disabled={disabled}
            onClick={() => togglePriority(p)}
            label={p}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase text-muted-foreground">Type</span>
        {availableTypes.map((t) => (
          <FilterPill
            key={t}
            active={state.conflictTypes.has(t)}
            disabled={disabled}
            onClick={() => toggleType(t)}
            label={t}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase text-muted-foreground">Company</span>
        <Input
          value={state.companyQuery}
          disabled={disabled}
          onChange={(e) => onChange({ ...state, companyQuery: e.target.value })}
          placeholder="Filter by company name"
          className="h-8 max-w-xs"
        />
        <span className="text-xs uppercase text-muted-foreground ml-4">Status</span>
        {(["ALL", "PENDING", "DECIDED"] as const).map((s) => (
          <FilterPill
            key={s}
            active={state.decisionStatus === s}
            disabled={disabled}
            onClick={() => onChange({ ...state, decisionStatus: s })}
            label={s}
          />
        ))}
        {(state.priorities.size > 0 ||
          state.conflictTypes.size > 0 ||
          state.companyQuery.length > 0 ||
          state.decisionStatus !== "ALL") && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(emptyFilters())}
            className="ml-auto"
          >
            Clear
          </Button>
        )}
      </div>
      {disabled && disabledHint ? (
        <p className="text-xs text-muted-foreground">{disabledHint}</p>
      ) : null}
    </fieldset>
  );
}

interface FilterPillProps {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
}

function FilterPill({ active, disabled, onClick, label }: FilterPillProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-accent",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      {label}
    </button>
  );
}

export function applyFilters(
  conflicts: ReportConflict[],
  filters: FilterState,
  decisions: Record<string, string>,
): ReportConflict[] {
  return conflicts.filter((c) => {
    if (filters.priorities.size > 0 && !filters.priorities.has(c.priority)) {
      return false;
    }
    if (
      filters.conflictTypes.size > 0 &&
      !filters.conflictTypes.has(c.conflict_type)
    ) {
      return false;
    }
    if (filters.companyQuery.trim()) {
      const q = filters.companyQuery.trim().toLowerCase();
      const h = c.hubspot_company?.toLowerCase() ?? "";
      const qb = c.quickbooks_company?.toLowerCase() ?? "";
      if (!h.includes(q) && !qb.includes(q)) return false;
    }
    if (filters.decisionStatus === "PENDING" && decisions[c.conflict_id]) {
      return false;
    }
    if (filters.decisionStatus === "DECIDED" && !decisions[c.conflict_id]) {
      return false;
    }
    return true;
  });
}
