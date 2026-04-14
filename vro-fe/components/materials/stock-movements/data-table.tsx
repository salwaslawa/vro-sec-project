"use client";

import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnfoldHorizontalIcon, Download } from "lucide-react"; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import React, { useMemo } from "react";
import { StockMovement, useAuthStore } from "@/lib/types"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


function formatMovementType(t: string) {
  const lower = t.toLowerCase().trim();
  // Existing
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


export interface MergedStockMovement extends StockMovement {
  movementTypes: string[];
  sohDetails?: StockMovement;
  vendorDetails?: StockMovement;
  relatedBins: number[];
}

interface DataTableProps {
  columns: ColumnDef<MergedStockMovement, unknown>[];
  data: StockMovement[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export function StockMovementDataTable({ columns, data }: DataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const [exportFormat, setExportFormat] = React.useState<"csv" | "pdf">("csv");
  const [pdfOrientation, setPdfOrientation] = React.useState<"portrait" | "landscape">("landscape"); 

  const username = useAuthStore((state) => state.username);
  
  // --- LOGIC GROUPING & SUMMING DIPERBAIKI ---
  const groupedData = useMemo(() => {
    const groups: Record<string, MergedStockMovement> = {};
    
    data.forEach((row) => {
      const key = [new Date(row.timestamp).toISOString(), row.materialCode].join("_");
      const isVendorAction = row.movementType.toLowerCase().includes("vendor");
      
      let currentBinNum: number | null = null;
      if (row.binSequenceId && row.binSequenceId.Valid) {
        currentBinNum = row.binSequenceId.Int64;
      }

      if (!groups[key]) {
        groups[key] = {
          ...row,
          movementTypes: [row.movementType],
          sohDetails: !isVendorAction ? row : undefined,
          vendorDetails: isVendorAction ? row : undefined,
          relatedBins: currentBinNum ? [currentBinNum] : [],
        };
      } else {
        const group = groups[key];

        if (!group.movementTypes.includes(row.movementType)) {
          group.movementTypes.push(row.movementType);
        }

        if (currentBinNum && !group.relatedBins.includes(currentBinNum)) {
          group.relatedBins.push(currentBinNum);
          group.relatedBins.sort((a, b) => a - b);
        }

        // --- PERBAIKAN MATEMATIKA SOH/VENDOR ---
        if (isVendorAction) {
          if (group.vendorDetails) {
            const mergedChange = group.vendorDetails.quantityChange + row.quantityChange;
            
            // TENTUKAN NEW QUANTITY YANG BENAR (ANCHOR)
            // Jika + (nambah): Ambil Max New Quantity
            // Jika - (kurang): Ambil Min New Quantity
            let finalNew = group.vendorDetails.newQuantity;
            if (mergedChange > 0) {
                 finalNew = Math.max(group.vendorDetails.newQuantity, row.newQuantity);
            } else {
                 finalNew = Math.min(group.vendorDetails.newQuantity, row.newQuantity);
            }

            group.vendorDetails = {
              ...group.vendorDetails,
              quantityChange: mergedChange,
              newQuantity: finalNew,
              oldQuantity: finalNew - mergedChange, // Hitung mundur dari Anchor
            };
          } else {
            group.vendorDetails = row;
          }
        } else {
          // Logic SOH Details
          if (group.sohDetails) {
            const mergedChange = group.sohDetails.quantityChange + row.quantityChange;
            
            // TENTUKAN NEW QUANTITY YANG BENAR (ANCHOR)
            let finalNew = group.sohDetails.newQuantity;
            if (mergedChange > 0) {
                 finalNew = Math.max(group.sohDetails.newQuantity, row.newQuantity);
            } else {
                 finalNew = Math.min(group.sohDetails.newQuantity, row.newQuantity);
            }

            group.sohDetails = {
              ...group.sohDetails,
              quantityChange: mergedChange,
              newQuantity: finalNew,
              oldQuantity: finalNew - mergedChange, // Hitung mundur dari Anchor
            };
          } else {
            group.sohDetails = row;
          }
        }
      }
    });

    return Object.values(groups).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [data]);

  const table = useReactTable<MergedStockMovement>({
    data: groupedData,
    columns,
    state: { sorting, columnFilters, globalFilter, columnVisibility },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const handleDownload = async () => {
    const rows = table.getFilteredRowModel().rows;
    if (rows.length === 0) {
      alert("Tidak ada data terfilter untuk diekstrak.");
      return;
    }

    const now = new Date();
    const filenameTimestamp = now.toISOString().split("T")[0];
    const reportTimestamp = now.toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "long",
    });

    const headers = [
      "Waktu",
      "Tipe Aksi",
      "SOH Awal",
      "SOH Akhir",
      "Perubahan SOH",
      "Vendor Stok Awal",
      "Vendor Stok Akhir",
      "Perubahan Vendor",
      "Bin Terkait",
      "PIC",
      "Catatan (SOH)",
      "Catatan (Vendor)",
    ];

    const dataToExport = rows.map((row) => {
      const original = row.original;
      
      const timestamp = new Date(original.timestamp).toLocaleString("id-ID", {
          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
      
      const movementTypes = original.movementTypes.map(formatMovementType).join(", ");
      
      const sohOld = original.sohDetails ? original.sohDetails.oldQuantity : "-";
      const sohNew = original.sohDetails ? original.sohDetails.newQuantity : "-";
      const sohChange = original.sohDetails ? 
          (original.sohDetails.quantityChange > 0 ? `+${original.sohDetails.quantityChange}` : original.sohDetails.quantityChange) 
          : "-";
      const sohNotes = original.sohDetails?.notes?.Valid ? original.sohDetails.notes.String : "-";

      const vendOld = original.vendorDetails ? original.vendorDetails.oldQuantity : "-";
      const vendNew = original.vendorDetails ? original.vendorDetails.newQuantity : "-";
      const vendChange = original.vendorDetails ? 
          (original.vendorDetails.quantityChange > 0 ? `+${original.vendorDetails.quantityChange}` : original.vendorDetails.quantityChange) 
          : "-";
      const vendNotes = original.vendorDetails?.notes?.Valid ? original.vendorDetails.notes.String : "-";

      const bins = original.relatedBins.length > 0 ? `Bin ${original.relatedBins.join(", ")}` : "-";

      return [
        timestamp,
        movementTypes,
        sohOld,
        sohNew,
        sohChange,
        vendOld,
        vendNew,
        vendChange,
        bins,
        original.pic,
        sohNotes,
        vendNotes
      ];
    });

    if (exportFormat === "csv") {
      const escapeCsvCell = (cell: unknown) => {
        const str = String(cell ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      let csvContent = headers.join(",") + "\n";
      dataToExport.forEach((rowArray) => {
        csvContent += rowArray.map(escapeCsvCell).join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `stock_history_extract_${filenameTimestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } 
    else if (exportFormat === "pdf") {
      const doc = new jsPDF(pdfOrientation, "pt", "a4");

      doc.setFontSize(16);
      doc.text("Laporan Riwayat Pergerakan Stok", 40, 40);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Diekstrak pada: ${reportTimestamp}`, 40, 55);
      
      if(groupedData.length > 0) {
        doc.text(`Kode Material: ${groupedData[0].materialCode}`, 40, 70);
      }

      autoTable(doc, {
        startY: 85,
        head: [headers],
        body: dataToExport.map((row) => row.map((cell) => String(cell ?? "-"))),
        theme: "striped",
        headStyles: { fillColor: [38, 38, 38] },
        styles: {
          fontSize: 7,
          cellPadding: 3,
          valign: 'middle'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });

      doc.save(`stock_history_extract_${filenameTimestamp}.pdf`);
    }

    if (username) {
      try {
        await fetch(`${API_URL}/api/logs/download`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username }),
        });
      } catch (error) {
        console.error("Gagal mencatat log download:", error);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          type="text"
          placeholder="Cari di semua kolom..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />

        <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="hidden h-9 lg:flex">
                  <Download className="mr-2 h-4 w-4" />
                  Extract
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Pilih Format Ekstrak</AlertDialogTitle>
                  <AlertDialogDescription>
                    Download riwayat stok dalam format CSV atau PDF.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Format File</Label>
                    <RadioGroup
                      value={exportFormat}
                      onValueChange={(value) =>
                        setExportFormat(value as "csv" | "pdf")
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="csv" id="r-csv" />
                        <Label htmlFor="r-csv">CSV</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pdf" id="r-pdf" />
                        <Label htmlFor="r-pdf">PDF</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label>Orientasi PDF</Label>
                    <RadioGroup
                      value={pdfOrientation}
                      onValueChange={(value) =>
                        setPdfOrientation(value as "portrait" | "landscape")
                      }
                      disabled={exportFormat !== "pdf"}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="portrait" id="r-portrait" />
                        <Label htmlFor="r-portrait">Portrait</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="landscape" id="r-landscape" />
                        <Label htmlFor="r-landscape">Landscape</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDownload}>
                    Download
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="hidden h-9 lg:flex"
              >
                <UnfoldHorizontalIcon className="mr-2 h-4 w-4" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuLabel>Toggle kolom</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllLeafColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                      onSelect={(event) => event.preventDefault()} 
                    >
                      {column.id
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead colSpan={columns.length}>
                <span className="text-sm font-light text-muted-foreground">
                  Total {table.getFilteredRowModel().rows.length} data
                </span>
              </TableHead>
            </TableRow>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
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
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="font-light">
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
                <TableCell colSpan={columns.length} className="text-center">
                  Tidak ada data histori.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-light">Baris per halaman:</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 15, 20, 25, 30, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-4">
          <div className="w-[100px] text-sm text-center">
            Page {table.getState().pagination.pageIndex + 1} /{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              className="border text-black bg-background"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Back
            </Button>
            <Button
              size="sm"
              className="border text-black bg-background"
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