import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  function Textarea({ className, autoComplete, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn("ui-textarea", className)}
        autoComplete={autoComplete ?? "off"}
        {...props}
      />
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }
