"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EyebrowTag } from "@/components/EyebrowTag";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const reduce = useReducedMotion();
  const stagger = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 14 },
    animate: reduce ? undefined : { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: EASE, delay: 0.05 + i * 0.07 },
  });

  return (
    <section className="relative w-full overflow-hidden" data-landing-section="hero">
      {/* whisper-light radial halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(10,10,10,0.04), transparent 70%)",
        }}
      />
      <div className="mx-auto w-full max-w-[1120px] px-6 pt-20 md:pt-28 pb-12 md:pb-16 flex flex-col items-center text-center gap-7">
        <motion.div {...stagger(0)}>
          <EyebrowTag>For RevOps teams on HubSpot + QuickBooks</EyebrowTag>
        </motion.div>

        <motion.h1
          {...stagger(1)}
          className="font-serif text-fg text-[clamp(44px,7vw,78px)] leading-[1.02] tracking-[-0.025em] max-w-[940px] text-balance"
        >
          Reconcile HubSpot and QuickBooks,{" "}
          <em className="italic text-fg-muted">in plain English.</em>
        </motion.h1>

        <motion.p
          {...stagger(2)}
          className="text-[17px] md:text-[18px] text-fg-muted max-w-[640px] leading-relaxed text-pretty"
        >
          Drop two CSVs. Crossbook explains every conflict, duplicate, and missing
          invoice in plain English — with the exact row index from both files.
          First report free. $49/month thereafter.
        </motion.p>

        <motion.div {...stagger(3)} className="flex flex-wrap justify-center gap-3 mt-1">
          <Link href="/upload">
            <Button variant="default" size="lg" className="gap-2">
              Try free <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="/how-it-works">
            <Button variant="ghost" size="lg">See a sample report</Button>
          </Link>
        </motion.div>

        <motion.p
          {...stagger(4)}
          className="text-[13px] text-fg-muted/80 tracking-[0.01em]"
        >
          Source-cited · GDPR-ready · 60-second setup
        </motion.p>
      </div>
    </section>
  );
}
