"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Command({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="command" className={cn("ui-command", className)} {...props} />
}

function CommandInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <div className="ui-command-input-wrap" data-slot="command-input-wrap">
      <SearchIcon className="ui-command-input-icon" />
      <input data-slot="command-input" className={cn("ui-command-input", className)} {...props} />
    </div>
  )
}

function CommandList({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="command-list" className={cn("ui-command-list", className)} {...props} />
}

function CommandEmpty({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="command-empty" className={cn("ui-command-empty", className)} {...props} />
}

function CommandGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="command-group" className={cn("ui-command-group", className)} {...props} />
}

function CommandSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="command-separator" className={cn("ui-command-separator", className)} {...props} />
}

function CommandItem({ className, ...props }: React.ComponentProps<"button">) {
  return <button type="button" data-slot="command-item" className={cn("ui-command-item", className)} {...props} />
}

function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="command-shortcut" className={cn("ui-command-shortcut", className)} {...props} />
}

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator
}
