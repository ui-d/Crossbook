import { cn } from "@/lib/utils";

/**
 * Crossbook brand mark: a serif-italic uppercase "C" struck through by a
 * horizontal ledger line — the reconciliation "cross-stroke". This is the
 * single source of truth for the on-DOM mark (navbar, anywhere in-app).
 *
 * The three `next/og` routes (app/icon.tsx, app/apple-icon.tsx,
 * app/opengraph-image.tsx) re-create this geometry inline because Satori
 * cannot render a React client component — keep their proportions in sync
 * with the constants below if you change them here.
 */

/** Proportions expressed as a fraction of the outer box edge. */
const RATIO = {
  radius: 0.29, // corner radius (~8px at size 28)
  glyph: 0.62, // serif "C" font-size
  barHeight: 0.075, // cross-stroke thickness
  barWidth: 0.6, // cross-stroke length
} as const;

interface BrandMarkProps {
  /** Outer box edge length in px. */
  size?: number;
  /**
   * "inverted" = ink box + light glyph (used in the light navbar).
   * "plain" = light box + ink glyph + hairline border.
   */
  variant?: "inverted" | "plain";
  className?: string;
}

export function BrandMark({
  size = 28,
  variant = "inverted",
  className,
}: BrandMarkProps) {
  const inverted = variant === "inverted";
  const radius = Math.round(size * RATIO.radius);
  const glyph = Math.round(size * RATIO.glyph);
  const barHeight = Math.max(2, Math.round(size * RATIO.barHeight));
  const barWidth = Math.round(size * RATIO.barWidth);

  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex items-center justify-center shrink-0",
        inverted
          ? "bg-fg text-bg"
          : "bg-bg text-fg border border-hairline",
        className,
      )}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <span
        className="font-serif italic leading-none"
        style={{ fontSize: glyph, letterSpacing: "-0.02em" }}
      >
        C
      </span>
      {/* Reconciliation cross-stroke — inherits glyph color via currentColor.
          Nudged slightly left so it pokes past the C's stem like a ledger tick. */}
      <span
        className="absolute rounded-full bg-current"
        style={{
          height: barHeight,
          width: barWidth,
          left: "50%",
          top: "50%",
          transform: "translate(-54%, -50%)",
        }}
      />
    </span>
  );
}
