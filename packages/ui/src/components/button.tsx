"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { uiStyles } from "../styles";

const buttonVariants = cva(uiStyles.buttonBase, {
  variants: {
    variant: {
      ghost: uiStyles.buttonGhost,
      primary: uiStyles.buttonPrimary
    }
  },
  defaultVariants: {
    variant: "ghost"
  }
});

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, ...props },
  ref
) {
  return <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />;
});

Button.displayName = "Button";
