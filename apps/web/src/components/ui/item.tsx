import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import styles from "./item.module.scss";

type ItemVariant = "default" | "outline" | "muted";
type ItemSize = "default" | "sm" | "xs";

function Item({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { variant?: ItemVariant; size?: ItemSize; asChild?: boolean }) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot="item"
      data-variant={variant}
      data-size={size}
      className={cn(styles.itemRoot, className)}
      {...props}
    />
  );
}

function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-group" className={cn(styles.itemGroup, className)} {...props} />;
}

function ItemSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-separator" className={cn(styles.itemSeparator, className)} {...props} />;
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-content" className={cn(styles.itemContent, className)} {...props} />;
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-title" className={cn(styles.itemTitle, className)} {...props} />;
}

function ItemDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-description" className={cn(styles.itemDescription, className)} {...props} />;
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-actions" className={cn(styles.itemActions, className)} {...props} />;
}

export { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemSeparator, ItemTitle };
