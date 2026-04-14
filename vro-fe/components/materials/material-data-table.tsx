"use client";

import React, { useMemo, useCallback } from "react";
import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
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
import { Material, useAuthStore, StockMovement } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { 
  UnfoldHorizontalIcon, 
  X, 
  Download, 
  History, 
  Trash2 
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface DataTableProps<TData extends Material, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onDataChanged?: () => void; 
}

interface LastDownloadInfo {
  username: string;
  timestamp: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export function MaterialDataTable<TData extends Material, TValue>({
  columns,
  data,
  onDataChanged
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      minBinQty: false,
      packQuantity: false,
      maxBinQty: false,
      totalBins: false,
      pic: false,
    });

  const [globalFilter, setGlobalFilter] = React.useState("");
  const [inputValue, setInputValue] = React.useState("");
  const [filterChips, setFilterChips] = React.useState<string[]>([]);
  
  const [rowSelection, setRowSelection] = React.useState({});

  const [exportFormat, setExportFormat] = React.useState<"csv" | "pdf">("csv");
  const [pdfOrientation, setPdfOrientation] = React.useState<
    "portrait" | "landscape"
  >("portrait");

  const [lastDownloadInfo, setLastDownloadInfo] =
    React.useState<LastDownloadInfo | null>(null);

  const username = useAuthStore((state) => state.username);
  const role = useAuthStore((state) => state.role);
  const companyName = useAuthStore((state) => state.companyName);

  const authHeaders = useMemo(() => {
    return {
      "X-User-Role": role || "",
      "X-User-Company": companyName || "",
      "Content-Type": "application/json",
    };
  }, [role, companyName]);

  const multiWordFilterFn: FilterFn<TData> = (row, _columnId, filterValue) => {
    const filterWords = String(filterValue)
      .toLowerCase()
      .split(" ")
      .filter(Boolean);
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
      columnVisibility,
      rowSelection, 
    },
    filterFns: {
      multiWord: multiWordFilterFn,
    },
    enableRowSelection: true, 
    getRowId: (row) => (row as any).id?.toString(), 
    onRowSelectionChange: setRowSelection, 
    globalFilterFn: multiWordFilterFn,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
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

  const fetchLastDownload = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/logs/last-download`, {
        method: "GET",
        headers: authHeaders,
      });
      if (response.ok) {
        const data = await response.json();
        setLastDownloadInfo(data);
      }
    } catch (error) {
      console.error(error);
    }
  }, [authHeaders]);

  React.useEffect(() => {
    fetchLastDownload();
  }, [fetchLastDownload]);

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

  const handleBulkDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const idsToDelete = selectedRows.map((row) => (row.original as any).id);

    if (idsToDelete.length === 0) return;

    try {
      for (const id of idsToDelete) {
        await fetch(`${API_URL}/api/materials/${id}`, {
          method: "DELETE",
          headers: authHeaders,
        });
      }

      setRowSelection({});
      
      if (onDataChanged) {
        onDataChanged();
      } else {
        window.location.reload(); 
      }
      
      alert(`Berhasil menghapus ${idsToDelete.length} data.`);

    } catch (error) {
      console.error("Gagal menghapus data", error);
      alert("Terjadi kesalahan saat menghapus data.");
    }
  };

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
      "Kode Material",
      "Deskripsi",
      "SoH (Total Stok)",
      "Replenishment (Bin Kosong)",
      "Remark Status", // <--- Ganti nama sedikit biar jelas
      "Alasan Blokir", // <--- TAMBAHAN KOLOM BARU DI EXCEL
      "Vendor",
      "Vendor Stock",
      "Open PO",
      "Lokasi",
      "Tipe",
      "Min Qty",
      "Pack Qty",
      "Max Qty",
      "Total Bins",
      "PIC",
      "Rincian Stok Bin",
    ];

    const dataToExport = rows.map((row) => {
      const original = row.original as any; // Cast ke any biar TS nggak bawel
      let binDetails = "-";
      if (
        original.productType !== "kanban" &&
        original.bins &&
        original.bins.length > 0
      ) {
        binDetails = original.bins
          .map((b: any) => `Bin ${b.binSequenceId}: ${b.currentBinStock}`)
          .join(" | ");
      } else if (original.productType === "kanban") {
        binDetails = "Kanban System";
      }

      // --- LOGIC ALASAN BLOKIR ---
      let alasanBlokir = "-";
      if (original.productType === "block") {
         alasanBlokir = original.remarkBlock?.String || original.remarkBlock || "Diblokir";
      }

      // Bersihkan teks rahasia "BLOCKED|" dari kolom remark lama biar Excelnya rapi
      let remarkAsli = String(row.getValue("remark") || "");
      if (remarkAsli.startsWith("BLOCKED|")) {
          remarkAsli = "BLOCKED"; 
      }

      return [
        row.getValue("material"),
        row.getValue("materialDescription"),
        row.getValue("soh"),
        row.getValue("replenishment"),
        remarkAsli,          // <--- Remark status (ok, shortage, BLOCKED)
        alasanBlokir,        // <--- Kolom baru isi alasan panjangnya
        row.getValue("vendorCode"),
        row.getValue("vendorStock"),
        row.getValue("openPO"),
        row.getValue("lokasi"),
        row.getValue("productType"),
        row.getValue("minBinQty"),
        row.getValue("packQuantity"),
        row.getValue("maxBinQty"),
        row.getValue("totalBins"),
        row.getValue("pic"),
        binDetails,
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
      link.setAttribute(
        "download",
        `material_extract_${filenameTimestamp}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (exportFormat === "pdf") {
      const doc = new jsPDF(pdfOrientation, "pt", "a4");

      doc.setFontSize(16);
      doc.text("Laporan Ekstrak Material", 40, 40);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Diekstrak pada: ${reportTimestamp}`, 40, 55);

      autoTable(doc, {
        startY: 70,
        head: [headers],
        body: dataToExport.map((row) => row.map((cell) => String(cell ?? "-"))),
        theme: "striped",
        headStyles: { fillColor: [38, 38, 38] },
        styles: {
          fontSize: 7,
          cellPadding: 2,
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });

      doc.save(`material_extract_${filenameTimestamp}.pdf`);
    }

    if (username) {
      try {
        await fetch(`${API_URL}/api/logs/download`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ username: username }),
        });
        fetchLastDownload();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleDownloadAllHistory = async (
    format: "csv" | "pdf",
    orientation: "portrait" | "landscape"
  ) => {
    try {
      const response = await fetch(`${API_URL}/api/movements`, {
        method: "GET",
        headers: authHeaders,
      });

      if (!response.ok) throw new Error("Gagal mengambil data history");
      
      const movements: StockMovement[] = await response.json();

      if (movements.length === 0) {
        alert("Tidak ada data history ditemukan.");
        return;
      }

      const now = new Date();
      const filenameTimestamp = now.toISOString().split("T")[0];

      const headers = [
        "Waktu",
        "Kode Material",
        "Tipe",
        "Perubahan",
        "Qty Lama",
        "Qty Baru",
        "PIC",
        "Notes",
        "Bin ID",
      ];

      const dataToExport = movements.map((m) => {
        const timestamp = new Date(m.timestamp).toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const change =
          m.quantityChange > 0 ? `+${m.quantityChange}` : `${m.quantityChange}`;

        return [
          timestamp,
          m.materialCode,
          m.movementType,
          change,
          m.oldQuantity,
          m.newQuantity,
          m.pic,
          m.notes?.String || "-",
          m.binSequenceId?.Valid ? m.binSequenceId.Int64 : "-",
        ];
      });

      if (format === "csv") {
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

        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `GLOBAL_HISTORY_${filenameTimestamp}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === "pdf") {
        const doc = new jsPDF(orientation, "pt", "a4");
        doc.setFontSize(14);
        doc.text("Laporan Global History Stok", 40, 40);
        doc.setFontSize(10);
        doc.text(`Dicetak pada: ${now.toLocaleString("id-ID")}`, 40, 55);

        autoTable(doc, {
          startY: 70,
          head: [headers],
          body: dataToExport,
          theme: "striped",
          headStyles: { fillColor: [50, 50, 50] },
          styles: { fontSize: 8, cellPadding: 2 },
        });

        doc.save(`GLOBAL_HISTORY_${filenameTimestamp}.pdf`);
      }
    } catch (error) {
      console.error(error);
      alert("Gagal mendownload history.");
    }
  };

  // --- HITUNG DATA DINAMIS DI SINI ---
  const filteredRowsLength = table.getFilteredRowModel().rows.length;
  const totalRowsLength = data.length;
  // ------------------------------------

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between gap-4 flex-none">
        <div className="flex flex-col gap-2 w-full max-w-lg">
          <div className="flex items-center gap-2">

             <div className="flex items-center justify-center h-9 px-3 rounded-md border bg-muted/30 text-xs font-medium text-muted-foreground whitespace-nowrap shadow-sm">
                Total: <span className="text-foreground ml-1 font-bold">{filteredRowsLength}</span>
                {filteredRowsLength !== totalRowsLength && (
                    <span className="ml-1 text-[10px] text-muted-foreground opacity-70">
                         / {totalRowsLength}
                    </span>
                )}
            </div>
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

        <div className="flex items-center gap-2">
            {/* TOMBOL DELETE SELECTED */}
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
                  <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini akan menghapus {Object.keys(rowSelection).length} data material yang dipilih secara permanen.
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

          <div className="flex flex-row items-center gap-2">
            {lastDownloadInfo && (
              <span className="text-xs text-muted-foreground font-mono whitespace-nowrap hidden lg:block">
                Last: {lastDownloadInfo.username} @{" "} 
                {}
                {new Date(lastDownloadInfo.timestamp).toLocaleString("id-ID", {
                  timeStyle: "short",
                  dateStyle: "short",
                })}
              </span>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto hidden h-9 lg:flex gap-2"
                >
                  <Download className="h-4 w-4" />
                  Extract Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ekstrak Data</AlertDialogTitle>
                  <AlertDialogDescription>
                    Pilih jenis data yang ingin diunduh.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <Tabs defaultValue="material" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="material">
                      Data Material (Stok Saat Ini)
                    </TabsTrigger>
                    <TabsTrigger value="history">
                      History Pergerakan (Log)
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="material" className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Format</Label>
                        <RadioGroup
                          value={exportFormat}
                          onValueChange={(v) => setExportFormat(v as "csv" | "pdf")}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="csv" id="m-csv" />
                            <Label htmlFor="m-csv">CSV</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pdf" id="m-pdf" />
                            <Label htmlFor="m-pdf">PDF</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <Label>Orientasi PDF</Label>
                        <RadioGroup
                          value={pdfOrientation}
                          onValueChange={(v) => setPdfOrientation(v as "portrait" | "landscape")}
                          disabled={exportFormat !== "pdf"}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="portrait" id="m-p" />
                            <Label htmlFor="m-p">Portrait</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="landscape" id="m-l" />
                            <Label htmlFor="m-l">Landscape</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                    <Button className="w-full" onClick={handleDownload}>
                      Download Stok Saat Ini
                    </Button>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Format</Label>
                        <RadioGroup
                          value={exportFormat}
                          onValueChange={(v) => setExportFormat(v as "csv" | "pdf")}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="csv" id="h-csv" />
                            <Label htmlFor="h-csv">CSV</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pdf" id="h-pdf" />
                            <Label htmlFor="h-pdf">PDF</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <Label>Orientasi PDF</Label>
                        <RadioGroup
                          value={pdfOrientation}
                          onValueChange={(v) => setPdfOrientation(v as "portrait" | "landscape")}
                          disabled={exportFormat !== "pdf"}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="portrait" id="h-p" />
                            <Label htmlFor="h-p">Portrait</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="landscape" id="h-l" />
                            <Label htmlFor="h-l">Landscape</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-slate-700 hover:bg-slate-800"
                      onClick={() =>
                        handleDownloadAllHistory(exportFormat, pdfOrientation)
                      }
                    >
                      <History className="mr-2 h-4 w-4" /> Download Semua History
                    </Button>
                  </TabsContent>
                </Tabs>

                <AlertDialogFooter>
                  <AlertDialogCancel>Tutup</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

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

      <div className="rounded-md border flex-1 overflow-auto relative bg-white dark:bg-gray-950">
        <table className="w-full caption-bottom text-sm text-left">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id} 
                    className="sticky top-0 z-50 bg-gray-50 dark:bg-gray-950 shadow-sm h-12 px-4 align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
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
              table.getRowModel().rows.map((row) => {
                
                const isBlocked = (row.original as any).productType === "block";
                
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted 
                      ${isBlocked ? "bg-gray-100 opacity-40 grayscale decoration-gray-400" : ""}`} 
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
                );
              })
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
          <p className="text-sm font-light">Baris per halaman:</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[100px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 15, 20, 25, 50, 100, 200, 500, 1000].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex w-[100px] items-center justify-center text-sm font-light">
            Page {table.getState().pagination.pageIndex + 1} /{" "}
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