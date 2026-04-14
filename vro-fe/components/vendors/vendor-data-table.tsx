"use client";

import * as React from "react";
import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
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
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Vendor, useAuthStore } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Trash2, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DataTableProps<TData extends Vendor, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function VendorDataTable<TData extends Vendor, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [inputValue, setInputValue] = React.useState("");
  const [filterChips, setFilterChips] = React.useState<string[]>([]);
  
  // STATE BARU
  const [rowSelection, setRowSelection] = React.useState({});

  const role = useAuthStore((state) => state.role);

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
      rowSelection, // Add state
    },
    enableRowSelection: true,
    getRowId: (row) => (row as any).id?.toString(), // Map ID
    onRowSelectionChange: setRowSelection,
    filterFns: {
      multiWord: multiWordFilterFn,
    },
    globalFilterFn: multiWordFilterFn,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  React.useEffect(() => {
    const chipsString = filterChips.join(" ");
    const liveInputString = inputValue.trim().toLowerCase();
    const combinedFilter = [chipsString, liveInputString]
      .filter(Boolean)
      .join(" ");
    table.setGlobalFilter(combinedFilter);
  }, [filterChips, inputValue, table]);

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

  const isFiltered =
    filterChips.length > 0 || table.getState().columnFilters.length > 0;

  const resetFilters = () => {
    table.resetColumnFilters();
    setFilterChips([]);
    setInputValue("");
    table.setGlobalFilter(undefined);
  };

  // --- LOGIC BULK DELETE ---
  const handleBulkDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const idsToDelete = selectedRows.map((row) => (row.original as any).id);

    if (idsToDelete.length === 0) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      // Loop delete
      for (const id of idsToDelete) {
        await fetch(`${apiUrl}/api/vendors/${id}`, {
          method: "DELETE",
          headers: {
             "X-User-Role": role || "",
          }
        });
      }

      setRowSelection({});
      window.location.reload(); 
      
    } catch (error) {
      console.error("Gagal menghapus data", error);
      alert("Terjadi kesalahan saat menghapus data.");
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between gap-4 flex-none">
        <div className="flex flex-col gap-2 w-full max-w-lg">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder={
                filterChips.length === 0
                  ? "Cari, lalu tekan Enter..."
                  : "Tambah filter..."
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-grow"
            />
            {isFiltered && (
              <Button
                variant="ghost"
                onClick={resetFilters}
                className="h-9 px-2 lg:px-3"
              >
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
                  <button
                    onClick={() => removeChip(chip)}
                    className="rounded-full hover:bg-muted/50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
            {Object.keys(rowSelection).length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-9 gap-2">
                  <Trash2 className="h-4 w-4" />
                  Hapus ({Object.keys(rowSelection).length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Vendor?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini akan menghapus {Object.keys(rowSelection).length} vendor yang dipilih secara permanen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                    Ya, Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="rounded-md border flex-1 overflow-auto relative bg-white dark:bg-gray-950">
        <table className="w-full caption-bottom text-sm text-left">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    className="sticky top-0 z-50 bg-white dark:bg-gray-950 shadow-sm h-12 px-4 align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell className="p-4 align-middle font-light [&:has([role=checkbox])]:pr-0" key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center font-light"
                >
                  Tidak ada data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>


      <div className="flex items-center justify-between py-4 flex-none border-t mt-0">
        <div className="flex items-center space-x-2">
           <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} dari{" "}
            {table.getFilteredRowModel().rows.length} baris dipilih.
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex w-[100px] items-center justify-center text-sm font-light">
            Page {table.getState().pagination.pageIndex + 1} / {" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              className="border text-black bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Back
            </Button>
            <Button
              className="border text-black bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
      
    </div>
  );
}