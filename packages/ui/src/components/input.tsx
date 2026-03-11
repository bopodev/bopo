"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { uiStyles } from "../styles";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={cn(uiStyles.input, className)} {...props} />;
});

Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(uiStyles.input, "min-h-20 py-2", className)} {...props} />;
  }
);

Textarea.displayName = "Textarea";
