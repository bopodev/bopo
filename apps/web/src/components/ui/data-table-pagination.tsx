"use client";

import type { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  return (
    <div className="ui-data-table-pagination">
      <div className="ui-data-table-pagination-total">
        {table.getFilteredRowModel().rows.length} row(s) total
      </div>
      <div className="ui-data-table-pagination-controls">
        <div className="ui-data-table-pagination-size-group">
          <p className="ui-data-table-pagination-label">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="ui-data-table-pagination-size-trigger">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 25, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ui-data-table-pagination-page-info">
          Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
        </div>
        <div className="ui-data-table-pagination-buttons">
          <Button
            variant="outline"
            size="icon-sm"
            className="ui-data-table-pagination-button-desktop"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="ui-visually-hidden">Go to first page</span>
            <ChevronsLeft className="ui-data-table-pagination-icon" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="ui-visually-hidden">Go to previous page</span>
            <ChevronLeft className="ui-data-table-pagination-icon" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="ui-visually-hidden">Go to next page</span>
            <ChevronRight className="ui-data-table-pagination-icon" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="ui-data-table-pagination-button-desktop"
            onClick={() => table.setPageIndex(Math.max(table.getPageCount() - 1, 0))}
            disabled={!table.getCanNextPage()}
          >
            <span className="ui-visually-hidden">Go to last page</span>
            <ChevronsRight className="ui-data-table-pagination-icon" />
          </Button>
        </div>
      </div>
    </div>
  );
}
