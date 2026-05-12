import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-[10px] border border-hairline bg-bg px-3.5 py-2.5 text-[15px] text-fg placeholder:text-fg-muted/70 transition-[color,box-shadow,border-color] outline-none",
        "focus-visible:border-fg focus-visible:ring-2 focus-visible:ring-fg/10",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-danger aria-invalid:ring-danger/20",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
