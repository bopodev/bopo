"use client";

import type * as React from "react";
import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn("ui-data-table-column-header", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="ui-data-table-column-header-button">
            <span>{title}</span>
            {column.getIsSorted() === "desc" ? (
              <ArrowDown className="ui-data-table-column-header-icon" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp className="ui-data-table-column-header-icon" />
            ) : (
              <ChevronsUpDown className="ui-data-table-column-header-icon" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="ui-data-table-column-header-icon" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="ui-data-table-column-header-icon" />
            Desc
          </DropdownMenuItem>
          {column.getCanHide() ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                <EyeOff className="ui-data-table-column-header-icon" />
                Hide
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
