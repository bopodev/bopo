"use client";

import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

import { FieldLabel } from "@/components/ui/field";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function FieldLabelWithHelp({
  htmlFor,
  children,
  helpText,
  className
}: {
  htmlFor?: string;
  children: ReactNode;
  helpText: string;
  className?: string;
}) {
  return (
    <FieldLabel htmlFor={htmlFor} className={cn("ui-field-label--with-help", className)}>
      {children}
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="ui-label-help" aria-label="Field help">
            <HelpCircle aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="ui-tooltip-content--label-help">
          {helpText}
        </TooltipContent>
      </Tooltip>
    </FieldLabel>
  );
}
