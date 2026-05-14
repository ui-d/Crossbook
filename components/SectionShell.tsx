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
        // SSR/no-JS shows content fully visible; the JS-only `shouldAnimate`
        // gate keeps reveals from getting stuck off-screen on scroll restoration.
        initial={shouldAnimate ? { opacity: 0, y: 18 } : false}
        whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn("mx-auto w-full max-w-[1120px] px-6 py-20 md:py-24", inner)}
      >
        {children}
      </motion.div>
    </section>
  );
}
