import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[transform,background-color,color,border-color,box-shadow,opacity] duration-200 ease-out will-change-transform disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-fg/10 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
  {
    variants: {
      variant: {
        // Pure black pill (pipeview-style) — primary call to action
        default:
          "bg-fg text-bg hover:bg-fg/90 active:scale-[0.98]",
        cta:
          "bg-fg text-bg hover:bg-fg/90 active:scale-[0.98]",
        // White with hairline border
        outline:
          "bg-bg text-fg border border-hairline hover:bg-bg-tint",
        // Quiet text-only with hover tint
        ghost:
          "text-fg-muted hover:text-fg hover:bg-bg-tint",
        // Soft surface
        secondary:
          "bg-bg-tint text-fg border border-hairline hover:bg-hairline/40",
        // Danger
        destructive:
          "bg-danger text-bg hover:bg-danger/90",
        // Inline link
        link:
          "text-fg underline underline-offset-4 decoration-hairline hover:decoration-fg",
      },
      size: {
        default: "h-10 px-5 text-[14px] rounded-[10px] has-[>svg]:px-4",
        sm: "h-9 px-3.5 text-[13px] rounded-[8px] has-[>svg]:px-3",
        lg: "h-12 px-6 text-[15px] rounded-[10px] has-[>svg]:px-5",
        icon: "size-10 rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
