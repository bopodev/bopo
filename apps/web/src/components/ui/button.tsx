import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "ui-button",
  {
    variants: {
      variant: {
        default: "ui-button--default",
        destructive: "ui-button--destructive",
        outline: "ui-button--outline",
        secondary: "ui-button--secondary",
        ghost: "ui-button--ghost",
        link: "ui-button--link",
      },
      size: {
        default: "ui-button--size-default",
        xs: "ui-button--size-xs",
        sm: "ui-button--size-sm",
        lg: "ui-button--size-lg",
        icon: "ui-button--size-icon",
        "icon-xs": "ui-button--size-icon-xs",
        "icon-sm": "ui-button--size-icon-sm",
        "icon-lg": "ui-button--size-icon-lg",
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
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
