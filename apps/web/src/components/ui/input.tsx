import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, autoComplete, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn("ui-input", className)}
      autoComplete={autoComplete ?? "off"}
      {...props}
    />
  )
}

export { Input }
