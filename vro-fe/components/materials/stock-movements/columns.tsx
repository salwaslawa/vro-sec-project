"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import {
  StockMovement,
  GoSqlNullInt,
  GoSqlNullString,
} from "@/lib/types";
import { ArrowRight } from "lucide-react";
import { MergedStockMovement } from "./data-table";
import { DataTableColumnHeader } from "./column-header";


const customFilterFn = (
  row: Row<MergedStockMovement>,
  columnId: string,
  filterValue: string[]
) => {
  if (!filterValue || filterValue.length === 0) return true;

  const rowValue = row.getValue(columnId);
  let rowDisplayValue = "(Kosong)";

  if (typeof rowValue === "object" && rowValue !== null && "Valid" in rowValue) {
    if ((rowValue as GoSqlNullInt).Valid && "Int64" in rowValue) {
      rowDisplayValue = `Bin ${(rowValue as GoSqlNullInt).Int64}`;
    } else if ((rowValue as GoSqlNullString).Valid && "String" in rowValue) {
      rowDisplayValue = (rowValue as GoSqlNullString).String;
    }
  } else if (typeof rowValue === "string") {
    const date = new Date(rowValue);
    if (!isNaN(date.getTime()) && rowValue.includes("T") && rowValue.includes("Z")) {
      rowDisplayValue = date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      rowDisplayValue = rowValue;
    }
  }

  if (rowDisplayValue === "(Kosong)" && filterValue.includes("(Kosong)")) {
    return true;
  }

  return filterValue.includes(rowDisplayValue);
};


const binFilterFn = (
  row: Row<MergedStockMovement>,
  columnId: string,
  filterValues: string[]
) => {
  if (!filterValues || filterValues.length === 0) return true;

  const bins = row.original.relatedBins || [];

  
  
  const hasBinMatch = bins.some((binNum) => filterValues.includes(`Bin ${binNum}`));
  if (hasBinMatch) return true;

  
  
  if (filterValues.includes("(Kosong)")) {
    return bins.length === 0;
  }

  return false;
};

function formatMovementType(t: string) {
  const lower = t.toLowerCase().trim();
  if (lower === "scan in") return "Scan In Stock";
  if (lower === "scan out") return "Scan Out Stock";
  if (lower === "scan in vendor") return "Scan In Vendor Stock";
  if (lower === "scan out vendor") return "Scan Out Vendor Stock";
  if (lower === "edit") return "Edit Stock";
  if (lower === "edit vendor") return "Edit Vendor Stock";
  if (lower === "scan in (special)") return "Scan In Special";
  if (lower === "scan out (special)") return "Scan Out Special";
  if (lower === "edit (special)") return "Edit Stock Special";

  return t;
}
export const getStockMovementColumns =
  (): ColumnDef<MergedStockMovement, unknown>[] => [
    {
      id: "no",
      header: "No.",
      cell: ({ row }) => <span>{row.index + 1}</span>,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "timestamp",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Waktu" />
      ),
      cell: ({ row }) => {
        const raw = row.getValue("timestamp") as string;
        const date = new Date(raw);
        return (
          <div className="flex flex-col">
            <span className="text-sm">
              {date.toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="text-xs text-muted-foreground">
              {date.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        );
      },
      enableColumnFilter: true,
      filterFn: customFilterFn,
    },
    {
      accessorKey: "movementType",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tipe Aksi" />
      ),
      cell: ({ row }) => {
        const types =
          row.original.movementTypes ||
          ([row.getValue("movementType")] as string[]);

        return (
          <div className="flex flex-wrap gap-1">
            {types.map((type, index) => {
              const displayType = formatMovementType(type);
              return (
                <span
                  key={`${type}-${index}`}
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-foreground bg-secondary/20 border-border"
                >
                  {displayType}
                </span>
              );
            })}
          </div>
        );
      },
      enableColumnFilter: true,
      filterFn: customFilterFn,
    },
    {
      id: "sohChange",
      header: "Perubahan SOH",
      cell: ({ row }) => {
        const details: StockMovement | undefined = row.original.sohDetails;
        if (!details) return <span className="text-muted-foreground">-</span>;

        const { oldQuantity, newQuantity, quantityChange } = details;
        const isPositive = quantityChange > 0;

        return (
          <div className="flex items-center space-x-2 font-mono">
            <span>{oldQuantity}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold">{newQuantity}</span>
            <span
              className={`text-sm font-bold ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              ({isPositive ? `+${quantityChange}` : quantityChange})
            </span>
          </div>
        );
      },
    },
    {
      id: "vendorStockChange",
      header: "Perubahan Vendor Stok",
      cell: ({ row }) => {
        const details: StockMovement | undefined = row.original.vendorDetails;
        if (!details) return <span className="text-muted-foreground">-</span>;

        const { oldQuantity, newQuantity, quantityChange } = details;
        const isPositive = quantityChange > 0;

        return (
          <div className="flex items-center space-x-2 font-mono">
            <span>{oldQuantity}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold">{newQuantity}</span>
            <span
              className={`text-sm font-bold ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              ({isPositive ? `+${quantityChange}` : quantityChange})
            </span>
          </div>
        );
      },
    },
    
    
    {
      id: "binSequenceId",
      
      
      accessorFn: (row) => {
        if (row.relatedBins && row.relatedBins.length > 0) {
            return row.relatedBins;
        }
        return null;
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Bin" />
      ),
      cell: ({ row }) => {
        const bins = row.original.relatedBins;

        if (bins && bins.length > 0) {
          if (bins.length > 1) {
            return <span className="font-mono text-xs">Bin {bins.join(", ")}</span>;
          }
          return <span className="font-mono">Bin {bins[0]}</span>;
        }

        return <span className="text-muted-foreground">-</span>;
      },
      
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.relatedBins?.[0] ?? -1;
        const b = rowB.original.relatedBins?.[0] ?? -1;
        return a - b;
      },
      enableColumnFilter: true,
      filterFn: binFilterFn, 
    },
    
    {
      accessorKey: "pic",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="PIC" />
      ),
      enableColumnFilter: true,
      filterFn: customFilterFn,
    },
  ];