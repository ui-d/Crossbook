"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { HTMLAttributes, ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

const PARENT_VARIANTS: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export const CARD_VARIANT: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE },
  },
};

type DivPropsWithoutDragAnim = Omit<
  HTMLAttributes<HTMLDivElement>,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragExit"
  | "onDragLeave"
  | "onDragOver"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
>;

interface StaggerChildrenProps extends DivPropsWithoutDragAnim {
  children: ReactNode;
}

export function StaggerChildren({
  children,
  className,
  ...rest
}: StaggerChildrenProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={PARENT_VARIANTS}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps extends DivPropsWithoutDragAnim {
  children: ReactNode;
}

export function StaggerItem({
  children,
  className,
  ...rest
}: StaggerItemProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <motion.div variants={CARD_VARIANT} className={className} {...rest}>
      {children}
    </motion.div>
  );
}
