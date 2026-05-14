"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import sampleReport from "@/data/sample-report.json";
import Link from "next/link";

type Stage = 0 | 1 | 2 | 3 | 4 | 5;

interface DemoRow {
  id: string;
  company: string;
  hubSource: string;
  qboSource: string;
  hubValue: string;
  qboValue: string;
  conflictLabel: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  explanation: string;
}

const STAGE_TIMINGS: Record<Stage, number> = {
  0: 800,   // rows fade in (3 rows * 120ms stagger + 400ms duration = ~760ms)
  1: 1100,  // HIGH pulse + expand row 1
  2: 1400,  // Trust HubSpot auto-press (700ms press + breathing room)
  3: 1600,  // counters tick (500ms) + row strikes through + bg fades to success
  4: 1700,  // filter chip pulse + currency row collapse exit (350ms)
  5: 1500,  // pause before restart
};

export function InteractiveSample() {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>(0);
  const [paused, setPaused] = useState(false);
  const [decided, setDecided] = useState<Record<string, "TRUST_HUBSPOT" | "TRUST_QBO" | "IGNORE" | null>>({});
  const [filterOn, setFilterOn] = useState(false);

  const rows = useMemo<DemoRow[]>(
    () => [
      {
        id: "r1",
        company: "Stark Industries",
        hubSource: "row 89",
        qboSource: "row 64",
        hubValue: "$50,000",
        qboValue: "$15,000",
        conflictLabel: "Amount",
        priority: "HIGH",
        explanation:
          "HubSpot recorded $50,000 closed-won on Feb 20. QuickBooks invoiced $15,000 on Feb 25 — exactly 30% of the deal. Likely a deposit, with a $35,000 balance still unbilled.",
      },
      {
        id: "r2",
        company: "Wayne Enterprises",
        hubSource: "row 14",
        qboSource: "row 9",
        hubValue: "£12,500",
        qboValue: "$12,500",
        conflictLabel: "Currency",
        priority: "HIGH",
        explanation: "Same number, different currency. At today's FX that's a ~$4,000 gap.",
      },
      {
        id: "r3",
        company: "Hooli",
        hubSource: "row 73",
        qboSource: "row 52",
        hubValue: "$3,900",
        qboValue: "$4,290",
        conflictLabel: "Amount",
        priority: "MEDIUM",
        explanation: "Exactly 10% gap — likely tax added at invoice time but not tracked in HubSpot.",
      },
    ],
    [],
  );

  // Counters tied to current stage
  const conflicts = stage >= 3 ? (filterOn ? 34 : 46) : 47;
  const amountAtRisk = stage >= 3 ? 41_800 : 43_200;
  const highPriority = stage >= 3 ? 7 : 8;

  // Loop driver
  useEffect(() => {
    if (paused) return;
    const next: Stage = ((stage + 1) % 6) as Stage;
    const t = setTimeout(() => {
      if (next === 0) {
        // restart: clear interactive state
        setDecided({});
        setFilterOn(false);
      }
      if (next === 2) {
        setDecided((d) => ({ ...d, r1: "TRUST_HUBSPOT" }));
      }
      if (next === 4) {
        setFilterOn(true);
      }
      setStage(next);
    }, STAGE_TIMINGS[stage]);
    return () => clearTimeout(t);
  }, [stage, paused]);

  const handleDecision = useCallback(
    (rowId: string, decision: "TRUST_HUBSPOT" | "TRUST_QBO" | "IGNORE") => {
      setPaused(true);
      setDecided((d) => ({ ...d, [rowId]: decision }));
    },
    [],
  );

  const onMouseEnter = useCallback(() => setPaused(true), []);

  return (
    <div
      className="relative mx-auto w-full max-w-[980px]"
      onMouseEnter={onMouseEnter}
      onMouseLeave={() => {
        // resume only if user hasn't taken decisions
        if (Object.keys(decided).length === 0 && !filterOn) setPaused(false);
      }}
    >
      <motion.div
        initial={false}
        animate={reduce ? undefined : { rotateX: paused ? 0 : 1.5, rotateY: paused ? 0 : -0.8 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          transformStyle: "preserve-3d",
          perspective: 1200,
          willChange: reduce || paused ? "auto" : "transform",
        }}
        className="bg-bg/85 backdrop-blur-md border border-hairline rounded-[18px] shadow-lifted overflow-hidden"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-hairline bg-bg-tint/60">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <span className="font-mono text-[12px] text-fg-muted bg-bg border border-hairline rounded-full px-3 py-0.5">
              reconciliation-may-2026.crossbook
            </span>
          </div>
          <span className="text-[12px] text-fg-muted hidden md:inline">
            {paused ? "paused" : "demo · auto-play"}
          </span>
        </div>

        {/* Top metrics */}
        <div className="grid grid-cols-3 border-b border-hairline">
          <Metric label="Conflicts" value={conflicts} />
          <Metric label="Amount at risk" value={amountAtRisk} prefix="$" suffix="" format={(n) => Math.round(n).toLocaleString()} />
          <Metric label="High priority" value={highPriority} accent />
        </div>

        {/* Filter chip row */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-hairline bg-bg">
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active>All conflicts</FilterChip>
            <FilterChip>HIGH ({highPriority})</FilterChip>
            <FilterChip
              active={filterOn}
              animate={stage === 4}
              icon={filterOn ? <Check className="size-3" /> : null}
            >
              Currency-format ({filterOn ? "12 ignored" : "12"})
            </FilterChip>
            <FilterChip>Missing invoices (4)</FilterChip>
          </div>
          <div className="text-[12px] text-fg-muted hidden md:flex items-center gap-1">
            <Sparkles className="size-3" /> AI explanations live
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-hairline">
          <AnimatePresence initial={false}>
            {rows
              .filter((row) => !(filterOn && row.conflictLabel === "Currency"))
              .map((row, i) => (
                <DemoRowItem
                  key={row.id}
                  row={row}
                  index={i}
                  stage={stage}
                  decided={decided[row.id] ?? null}
                  onDecide={handleDecision}
                />
              ))}
          </AnimatePresence>

          {/* Collapsed currency summary */}
          <AnimatePresence>
            {filterOn && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35 }}
                className="bg-bg-tint/60 px-5 py-3 flex items-center gap-2 text-[13px] text-fg-muted"
              >
                <Check className="size-3.5 text-success" />
                12 currency-format mismatches collapsed —{" "}
                <span className="text-fg">ignored</span> as a group. No real conflict, formatting only.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-hairline bg-bg-tint/40 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-fg-muted">
            Decisions are local-only. Nothing leaves your browser.
          </p>
          <Link href="/upload">
            <Button variant="default" size="sm" className="gap-1.5">
              Try with your CSVs <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </motion.div>

      <p className="mt-6 text-center text-[12px] text-fg-muted">
        Live data shown: {sampleReport.summary.total_records_hubspot} HubSpot rows ×{" "}
        {sampleReport.summary.total_records_quickbooks} QBO rows · {sampleReport.conflicts.length} conflicts in the underlying fixture.
      </p>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function Metric({
  label,
  value,
  prefix = "",
  suffix = "",
  format,
  accent,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
  accent?: boolean;
}) {
  return (
    <div className="px-5 py-5 border-r border-hairline last:border-r-0 flex flex-col gap-1">
      <span className="text-eyebrow">{label}</span>
      <div
        className={cn(
          "font-serif text-[36px] leading-none tracking-tight",
          accent ? "text-danger" : "text-fg",
        )}
      >
        {prefix}
        <AnimatedNumber value={value} format={format} />
        {suffix}
      </div>
    </div>
  );
}

function FilterChip({
  children,
  active = false,
  animate = false,
  icon = null,
}: {
  children: React.ReactNode;
  active?: boolean;
  animate?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <motion.span
      animate={
        animate
          ? { scale: [1, 1.06, 1], boxShadow: ["0 0 0 0 rgba(10,10,10,0.0)", "0 0 0 4px rgba(10,10,10,0.08)", "0 0 0 0 rgba(10,10,10,0.0)"] }
          : {}
      }
      transition={{ duration: 0.6 }}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] border transition-colors",
        active
          ? "bg-fg text-bg border-fg"
          : "bg-bg text-fg-muted border-hairline hover:text-fg",
      )}
    >
      {icon}
      {children}
    </motion.span>
  );
}

function DemoRowItem({
  row,
  index,
  stage,
  decided,
  onDecide,
}: {
  row: DemoRow;
  index: number;
  stage: Stage;
  decided: "TRUST_HUBSPOT" | "TRUST_QBO" | "IGNORE" | null;
  onDecide: (rowId: string, decision: "TRUST_HUBSPOT" | "TRUST_QBO" | "IGNORE") => void;
}) {
  const isFirst = row.id === "r1";
  const showExpanded = isFirst && stage >= 1;
  const isPulsing = isFirst && stage === 1;
  const isResolved = decided !== null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: index * 0.12 }}
      className={cn(
        "px-5 py-4 flex flex-col gap-3 bg-bg transition-colors overflow-hidden",
        isResolved && "bg-success-soft/40",
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <PriorityPill priority={row.priority} pulsing={isPulsing} />
          <div className="flex flex-col min-w-0">
            <span
              className={cn(
                "font-medium text-[14px] text-fg truncate",
                isResolved && "line-through text-fg-muted",
              )}
            >
              {row.company}
            </span>
            <span className="font-mono text-[11px] text-fg-muted">
              HubSpot {row.hubSource} → QBO {row.qboSource}
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 font-mono text-[13px]">
          <span className="text-fg">{row.hubValue}</span>
          <ArrowRight className="size-3 text-fg-muted" />
          <span className="text-fg">{row.qboValue}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isResolved ? (
            <span className="inline-flex items-center gap-1 text-[12px] text-success font-medium">
              <Check className="size-3.5" /> Trusted HubSpot
            </span>
          ) : (
            <>
              <DecisionButton
                onClick={() => onDecide(row.id, "TRUST_HUBSPOT")}
                pressed={isFirst && stage === 2}
                primary
              >
                Trust HubSpot
              </DecisionButton>
              <DecisionButton onClick={() => onDecide(row.id, "TRUST_QBO")}>
                Trust QBO
              </DecisionButton>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35 }}
            className="text-[13px] text-fg-muted leading-relaxed pl-[68px] pr-2"
          >
            {row.explanation}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PriorityPill({
  priority,
  pulsing,
}: {
  priority: "HIGH" | "MEDIUM" | "LOW";
  pulsing: boolean;
}) {
  const palette = {
    HIGH: "bg-danger-soft text-danger",
    MEDIUM: "bg-warning-soft text-warning",
    LOW: "bg-bg-tint text-fg-muted",
  } as const;
  return (
    <motion.span
      animate={pulsing ? { scale: [1, 1.08, 1] } : {}}
      transition={{ duration: 0.6, repeat: pulsing ? 1 : 0 }}
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wider uppercase",
        palette[priority],
      )}
    >
      {priority}
    </motion.span>
  );
}

function DecisionButton({
  children,
  onClick,
  pressed = false,
  primary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  pressed?: boolean;
  primary?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      animate={
        pressed
          ? {
              scale: [1, 0.94, 1.02, 1],
              boxShadow: [
                "0 0 0 0 rgba(10,10,10,0.0)",
                "0 0 0 4px rgba(10,10,10,0.12)",
                "0 0 0 0 rgba(10,10,10,0.0)",
              ],
            }
          : {}
      }
      transition={{ duration: 0.7 }}
      className={cn(
        "px-2.5 py-1 rounded-[8px] text-[12px] border transition-colors",
        primary
          ? "bg-fg text-bg border-fg hover:bg-fg/90"
          : "bg-bg text-fg-muted border-hairline hover:text-fg hover:border-fg/40",
      )}
    >
      {children}
    </motion.button>
  );
}
