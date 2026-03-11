"use client";

import * as React from "react";
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  RowSelectionState
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
  getRowClassName?: (row: TData) => string | undefined;
  filterColumn?: string;
  filterPlaceholder?: string;
  toolbarActions?: React.ReactNode;
  showViewOptions?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage = "No results.",
  onRowClick,
  getRowClassName,
  filterColumn,
  filterPlaceholder = "Filter...",
  toolbarActions,
  showViewOptions = true
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection
    }
  });

  return (
    <div className="ui-data-table">
      {filterColumn || toolbarActions || showViewOptions ? (
        <div className="ui-data-table-toolbar">
          {filterColumn ? (
            <Input
              placeholder={filterPlaceholder}
              value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn(filterColumn)?.setFilterValue(event.target.value)}
              className="ui-data-table-filter-input"
            />
          ) : null}
          {toolbarActions ? <div className="ui-data-table-toolbar-actions">{toolbarActions}</div> : null}
          {showViewOptions ? <DataTableViewOptions table={table} /> : null}
        </div>
      ) : null}
      <div className="ui-data-table-surface">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="ui-data-table-header-row">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="ui-data-table-header-cell">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn("ui-data-table-row", onRowClick ? "ui-data-table-row-clickable" : undefined, getRowClassName?.(row.original))}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="ui-data-table-cell">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="ui-data-table-empty-cell">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
