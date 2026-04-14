"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  FilterFn,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { X } from "lucide-react";
import { cn } from "@/lib/utils"; 

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

type DeliveryStatus = "On Track" | "Need Delivery" | "Late";
const deliveryStatuses: DeliveryStatus[] = ["On Track", "Need Delivery", "Late"];
const statusFilterColumnIds = [
    "planDeliveryBasicKitPanel",
    "planDeliveryBasicKitBusbar",
    "planDeliveryAccessoriesPanel",
    "planDeliveryAccessoriesBusbar"
];


export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [inputValue, setInputValue] = React.useState("");
  const [filterChips, setFilterChips] = React.useState<string[]>([]);
  const [activeStatusFilter, setActiveStatusFilter] = React.useState<DeliveryStatus | null>(null);

  const multiWordFilterFn: FilterFn<TData> = (row, _columnId, filterValue) => {
    const filterWords = String(filterValue).toLowerCase().split(" ").filter(Boolean);
    if (filterWords.length === 0) return true;

    const rowText = row
      .getVisibleCells()
      .map((cell) => String(cell.getValue() ?? ""))
      .join(" ")
      .toLowerCase();

    return filterWords.every((word) => rowText.includes(word));
  };


  const table = useReactTable<TData>({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      columnVisibility: {
        derivedDeliveryStatus: false, 
      },
    },
    filterFns: {
      multiWord: multiWordFilterFn,
    },
    globalFilterFn: multiWordFilterFn,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  React.useEffect(() => {
    const chipsString = filterChips.join(" ");
    const liveInputString = inputValue.trim().toLowerCase();
    const combinedFilter = [chipsString, liveInputString].filter(Boolean).join(" ");
    table.setGlobalFilter(combinedFilter);
  }, [filterChips, inputValue, table]);

  const handleStatusFilterClick = (status: DeliveryStatus | null) => {
    const newStatus = activeStatusFilter === status ? null : status;
    setActiveStatusFilter(newStatus);

    statusFilterColumnIds.forEach(columnId => {
        table.getColumn(columnId)?.setFilterValue(newStatus ? [newStatus] : undefined); 
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const newChip = inputValue.trim().toLowerCase();

    if (event.key === "Enter" && newChip !== "") {
      event.preventDefault();
      if (!filterChips.includes(newChip)) {
        setFilterChips((prev) => [...prev, newChip]);
      }
      setInputValue("");
    }
  };

  const removeChip = (chipToRemove: string) => {
    setFilterChips((prev) => prev.filter((chip) => chip !== chipToRemove));
  };

  const resetFilters = () => {
    setActiveStatusFilter(null);
    statusFilterColumnIds.forEach(columnId => {
        table.getColumn(columnId)?.setFilterValue(undefined);
    });
    table.resetColumnFilters(); 
    setFilterChips([]);
    setInputValue("");
    table.setGlobalFilter(undefined); 
  };

  const isFiltered = filterChips.length > 0 || table.getState().columnFilters.length > 0 || activeStatusFilter !== null;


  return (
    <div className="space-y-4 pb-24 md:pb-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        
        <div className="flex flex-col gap-2 w-full max-w-lg">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder={filterChips.length === 0 ? "Cari, lalu tekan Enter..." : "Tambah filter..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-grow"
            />
            {isFiltered && (
              <Button variant="ghost" onClick={resetFilters} className="h-9 px-2 lg:px-3">
                Reset <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
          {filterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {filterChips.map((chip) => (
                <div
                  key={chip}
                  className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-sm"
                >
                  <span>{chip}</span>
                  <button onClick={() => removeChip(chip)} className="rounded-full hover:bg-muted/50">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-muted-foreground mr-1">Status:</span>
            {deliveryStatuses.map((status) => (
              <Button
                key={status}
                variant={activeStatusFilter === status ? "secondary" : "outline"}
                size="sm"
                className={cn(
                  "h-7 px-2.5 text-xs rounded-full",
                  status === "On Track" && activeStatusFilter === status && "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
                  status === "Need Delivery" && activeStatusFilter === status && "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
                  status === "Late" && activeStatusFilter === status && "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
                )}
                onClick={() => handleStatusFilterClick(status)}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

      </div>

       <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell className="font-light" key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center font-light">
                  Tidak ada data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </Button>
      </div>
    </div>
  );
}