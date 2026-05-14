"use client";

import { animate, useMotionValue, useTransform, useReducedMotion, motion } from "motion/react";
import { useEffect } from "react";

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  duration = 0.5,
  className,
}: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(reduce ? value : 0);
  const display = useTransform(motionValue, (latest) => format(latest));

  useEffect(() => {
    if (reduce) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [value, duration, motionValue, reduce]);

  return <motion.span className={className}>{display}</motion.span>;
}
