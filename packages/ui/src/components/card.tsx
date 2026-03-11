import type * as React from "react";
import { cn } from "../lib/cn";
import { uiStyles } from "../styles";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(uiStyles.card, className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(uiStyles.cardHeader, className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(uiStyles.cardBody, className)} {...props} />;
}
