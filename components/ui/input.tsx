import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-[10px] border border-hairline bg-bg px-3.5 py-2 text-[15px] text-fg placeholder:text-fg-muted/70 transition-[color,box-shadow,border-color] outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-fg",
        "selection:bg-fg selection:text-bg",
        "focus-visible:border-fg focus-visible:ring-2 focus-visible:ring-fg/10",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-danger aria-invalid:ring-danger/20",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
