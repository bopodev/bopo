import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, autoComplete, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn("ui-textarea", className)}
      autoComplete={autoComplete ?? "off"}
      {...props}
    />
  )
}

export { Textarea }
