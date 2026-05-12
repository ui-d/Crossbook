"use client";

import { motion, useReducedMotion } from "motion/react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionShellProps extends HTMLAttributes<HTMLElement> {
  tint?: boolean;
  children: ReactNode;
  inner?: string;
  /** Default true. Set false to disable the scroll-reveal animation entirely. */
  animate?: boolean;
}

export function SectionShell({
  tint = false,
  className,
  children,
  inner,
  animate = true,
  ...rest
}: SectionShellProps) {
  const reduce = useReducedMotion();
  const shouldAnimate = animate && !reduce;

  return (
    <section
      className={cn(
        "w-full",
        tint ? "bg-bg-tint" : "bg-bg",
        className,
      )}
      {...rest}
    >
      <motion.div
        // Content is fully visible by default; whileInView only adds a subtle
        // slide-up. This survives full-page screenshots and scroll restoration
        // (where IntersectionObserver may not fire reliably).
        initial={shouldAnimate ? { y: 18 } : false}
        whileInView={shouldAnimate ? { y: 0 } : undefined}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className={cn("mx-auto w-full max-w-[1120px] px-6 py-20 md:py-24", inner)}
      >
        {children}
      </motion.div>
    </section>
  );
}
