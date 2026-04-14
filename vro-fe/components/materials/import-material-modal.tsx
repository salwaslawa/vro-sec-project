"use client";

import { useState, useRef, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore, MaterialBin } from "@/lib/types"; 
import Papa from "papaparse";
import { FileSpreadsheet, UploadCloud, X, Download, AlertCircle, Check, Square, ArrowLeft, ArrowRight } from "lucide-react";

interface ImportMaterialModalProps {
  setIsOpen: (open: boolean) => void;
  onImportSuccess: () => void;
}

interface MaterialPayload {
  material: string;
  materialDescription?: string;
  lokasi?: string;
  packQuantity?: number;
  maxBinQty?: number;
  minBinQty?: number;
  vendorCode?: string;
  currentQuantity?: number; 
  productType?: "kanban" | "consumable" | "option" | "special";
  bins?: Partial<MaterialBin>[];
  isSmartImport?: boolean;
}

interface ValidationRow {
  rowNum: number;
  materialCode: string;
  col1: number; 
  col2: number; 
  message: string;
  originalRow: Record<string, string>;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const roundUpToPack = (value: number, packQty: number) => {
  if (packQty <= 0) return value;
  return Math.ceil(value / packQty) * packQty;
};

export function ImportMaterialModal({
  setIsOpen,
  onImportSuccess,
}: ImportMaterialModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [uploadPercent, setUploadPercent] = useState(0);
  
  
  const [activeTab, setActiveTab] = useState<"kanban" | "consumable" | "option" | "special">("kanban");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  
  const [isPreviewing, setIsPreviewing] = useState(false);
  
  const [overwriteBlank, setOverwriteBlank] = useState(false);

  const [validationRows, setValidationRows] = useState<ValidationRow[]>([]);
  const [validPayloads, setValidPayloads] = useState<MaterialPayload[]>([]);
  
  const authRole = useAuthStore((state) => state.role);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setValidationRows([]);
    setValidPayloads([]);
    setError(null);
    setIsPreviewing(false); 
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as "kanban" | "consumable" | "option" | "special");
    resetState();
  };

  const handleFileSelect = (file: File | undefined) => {
    setError(null);
    setValidationRows([]);
    setValidPayloads([]);
    setIsPreviewing(false);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setError("File harus berekstensi .csv");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleDragEnter = (e: DragEvent<HTMLLabelElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleDownloadTemplate = () => {
    let headers = ["Kode Material", "Deskripsi", "Lokasi", "Vendor", "Current Qty"];

    if (activeTab === "kanban") {
      headers.push("Pack Qty", "Max Qty");
    } else if (activeTab === "consumable") {
      headers.push("Pack Qty", "Total Bins", "Qty Per Bin");
    } else if (activeTab === "option") {
      headers.push("Total Bins", "Qty Per Bin");
    } else if (activeTab === "special") {
      
      headers.push("Pack Qty", "Max Qty");
    }

    const csvContent = headers.join(",");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `template-import-${activeTab}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Silakan pilih file CSV untuk diimpor.");
      return;
    }

    setIsLoading(true);
    setProgress("Menganalisis file...");
    setError(null);
    setValidationRows([]);
    setValidPayloads([]); 
    setIsPreviewing(false);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as Record<string, string>[];
        const fields = (results.meta.fields || []).map((f) => f.trim());
        
        if (!fields.includes("Kode Material")) {
          setError("Header 'Kode Material' Wajib ada.");
          setIsLoading(false);
          return;
        }

        const valErrs: ValidationRow[] = [];
        const valPayloads: MaterialPayload[] = [];

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const trimmed: Record<string, string> = {};
          for (const key in row) trimmed[key.trim()] = row[key] ? row[key].trim() : "";

          const code = trimmed["Kode Material"];
          if (!code) continue; 

          const hasField = (key: string) => fields.includes(key);

          const pInt = (key: string) => {
             const val = trimmed[key]?.replace(/[,.]/g, "");
             return val ? parseInt(val, 10) : 0;
          };

          const getValueString = (key: string): string | undefined => {
            if (!hasField(key)) return undefined; 
            if (!trimmed[key]) return overwriteBlank ? "" : undefined; 
            return trimmed[key];
          };

          const getValueInt = (key: string): number | undefined => {
            if (!hasField(key)) return undefined; 
            if (!trimmed[key]) return overwriteBlank ? 0 : undefined; 
            return parseInt(trimmed[key].replace(/[,.]/g, ""), 10) || 0;
          };
          
          const isStructureUpdate = hasField("Pack Qty") || hasField("Max Qty") || hasField("Total Bins") || hasField("Qty Per Bin");
          
          let packQty = getValueInt("Pack Qty");
          let currentQty = getValueInt("Current Qty");
          let maxBinQty: number | undefined;
          let minBinQty: number | undefined;
          let generatedBins: any[] | undefined = undefined;

          if (isStructureUpdate) {
             const valPack = hasField("Pack Qty") ? pInt("Pack Qty") : 0; 
             const valMax = hasField("Max Qty") ? pInt("Max Qty") : 0;
             const valTotalBins = hasField("Total Bins") ? pInt("Total Bins") : 0;
             const valQtyPerBin = hasField("Qty Per Bin") ? pInt("Qty Per Bin") : 0;
             const valCurrent = hasField("Current Qty") ? pInt("Current Qty") : 0;

             if (activeTab === "kanban") {
                const roundedMax = roundUpToPack(valMax, valPack);
                packQty = valPack;
                maxBinQty = roundedMax;
                minBinQty = valPack;
                currentQty = hasField("Current Qty") ? valCurrent : undefined;

             } else if (activeTab === "special") {
                
                
                
                packQty = valPack > 0 ? valPack : 1;
                maxBinQty = valMax > 0 ? valMax : packQty; 
                minBinQty = packQty;
                
                generatedBins = []; 
                currentQty = hasField("Current Qty") ? valCurrent : undefined;

             } else {
                
                let safePack = 1;
                if (activeTab === "consumable") safePack = hasField("Pack Qty") ? valPack : 1;
                const totalCap = valTotalBins * valQtyPerBin;
                packQty = safePack;
                maxBinQty = totalCap;
                minBinQty = safePack;
                
                generatedBins = Array.from({ length: valTotalBins }, (_, idx) => ({
                    binSequenceId: idx + 1,
                    maxBinStock: valQtyPerBin,
                    currentBinStock: 0 
                }));
             }
          }

          const payload: MaterialPayload = {
             material: code,
             isSmartImport: true, 
             productType: activeTab,
          };
          
          const desc = getValueString("Deskripsi");
          if (desc !== undefined) payload.materialDescription = desc;

          const loc = getValueString("Lokasi");
          if (loc !== undefined) payload.lokasi = loc;

          const vend = getValueString("Vendor");
          if (vend !== undefined) payload.vendorCode = vend;

          if (currentQty !== undefined) payload.currentQuantity = currentQty;
          
          if (packQty !== undefined) payload.packQuantity = packQty;
          if (maxBinQty !== undefined) payload.maxBinQty = maxBinQty;
          if (minBinQty !== undefined) payload.minBinQty = minBinQty;
          if (generatedBins !== undefined) payload.bins = generatedBins;

          valPayloads.push(payload);
        }

        setValidationRows(valErrs);
        setValidPayloads(valPayloads);
        setIsLoading(false);
        setProgress("");

        if (valErrs.length === 0 && valPayloads.length > 0) {
            setIsPreviewing(true);
        }
      },
      error: (error) => {
        setError(`Gagal mem-parsing file CSV: ${error.message}`);
        setIsLoading(false);
      },
    });
  };

  
  const handlePreviewChange = (index: number, field: keyof MaterialPayload, value: string) => {
    const updated = [...validPayloads];
    
    const item = { ...updated[index] };

    
    if (field === "packQuantity" || field === "maxBinQty") {
      const num = parseInt(value);
      (item as any)[field] = isNaN(num) ? 0 : num; 
    } else {
      (item as any)[field] = value;
    }

    updated[index] = item;
    setValidPayloads(updated);
  };

  const handleEditField = (index: number, field: "col1" | "col2", value: string) => {
    const updated = [...validationRows];
    const numValue = parseInt(value, 10);
    updated[index][field] = isNaN(numValue) ? 0 : numValue;
    updated[index].message = "Klik Simpan untuk update"; 
    setValidationRows(updated);
  };

  const handleRevalidateRow = (index: number) => {
    const updatedRows = [...validationRows];
    const row = updatedRows[index];
    const trimmed = row.originalRow;
    const val1 = row.col1; 
    const val2 = row.col2; 
    const pInt = (key: string) => parseInt(trimmed[key]?.replace(/[,.]/g, "") || "0", 10);
    const currentQty = trimmed["Current Qty"] ? pInt("Current Qty") : undefined;
    let newPayload: MaterialPayload | null = null;

    if (activeTab === "kanban") {
        const packQty = val2;
        const rawMax = val1;
        const roundedMax = roundUpToPack(rawMax, packQty);
        newPayload = {
            material: row.materialCode,
            isSmartImport: true,
            productType: "kanban",
            packQuantity: packQty,
            maxBinQty: roundedMax,
            minBinQty: packQty,
            currentQuantity: currentQty,
            materialDescription: trimmed["Deskripsi"],
            lokasi: trimmed["Lokasi"],
            vendorCode: trimmed["Vendor"],
        };
    } else if (activeTab === "special") {
        
        const packQty = val2; 
        const maxQty = val1;  
        newPayload = {
            material: row.materialCode,
            isSmartImport: true,
            productType: "special",
            packQuantity: packQty,
            maxBinQty: maxQty,
            minBinQty: packQty,
            currentQuantity: currentQty,
            bins: [],
            materialDescription: trimmed["Deskripsi"],
            lokasi: trimmed["Lokasi"],
            vendorCode: trimmed["Vendor"],
        };
    } else {
        const totalBins = val1;
        const qtyPerBin = val2;
        const totalCap = totalBins * qtyPerBin;
        const generatedBins = Array.from({ length: totalBins }, (_, idx) => ({
            binSequenceId: idx + 1,
            maxBinStock: qtyPerBin,
            currentBinStock: 0 
        }));
        newPayload = {
            material: row.materialCode,
            isSmartImport: true,
            productType: activeTab,
            packQuantity: trimmed["Pack Qty"] ? pInt("Pack Qty") : 1, 
            maxBinQty: totalCap,
            minBinQty: 1,
            currentQuantity: currentQty,
            bins: generatedBins,
            materialDescription: trimmed["Deskripsi"],
            lokasi: trimmed["Lokasi"],
            vendorCode: trimmed["Vendor"],
        };
    }

    if (newPayload) {
        setValidPayloads((prev) => [...prev, newPayload!]);
        updatedRows.splice(index, 1);
        setValidationRows(updatedRows);
        if (updatedRows.length === 0) {
            setIsPreviewing(true);
        }
    }
  };

  const handleFinalImport = async () => {
    if (validPayloads.length === 0) return;

    setIsLoading(true);
    setProgress("Mengimpor data...");
    let successCount = 0;
    const apiErrors: string[] = [];
    
    for (let i = 0; i < validPayloads.length; i++) {
      const payload = validPayloads[i];
      const percent = Math.round(((i + 1) / validPayloads.length) * 100);
      setUploadPercent(percent);
      setProgress(`Mengimpor ${i + 1}/${validPayloads.length}: ${payload.material}`);

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/smart-import`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-User-Role": authRole || "",
            },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
           const json = await res.json();
           throw new Error(json.error || `HTTP ${res.status}`);
        }
        successCount++;
      } catch (err) {
        apiErrors.push(`Gagal ${payload.material}: ${String(err)}`);
      }
    }

    setIsLoading(false);
    setProgress("");
    setUploadPercent(0);
    alert(`Impor selesai.\nBerhasil: ${successCount}\nGagal: ${apiErrors.length}`);
    if (apiErrors.length > 0) console.error(apiErrors);
    
    onImportSuccess();
    setIsOpen(false);
  };

  const UploadArea = () => (
    <div className="space-y-4">
        <div className="flex items-center space-x-2 border p-3 rounded-md bg-gray-50 dark:bg-gray-900/50">
            <button 
                type="button"
                onClick={() => setOverwriteBlank(!overwriteBlank)}
                className="flex items-center justify-center w-5 h-5 text-primary focus:outline-none"
            >
                {overwriteBlank ? (
                    <div className="flex items-center justify-center w-5 h-5 text-white bg-[#008A15] rounded-sm">
                        <Check className="w-4 h-4" />
                    </div>
                ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                )}
            </button>
            <div className="space-y-1 cursor-pointer" onClick={() => setOverwriteBlank(!overwriteBlank)}>
                <Label className="cursor-pointer font-regular">Timpa data kosong (Overwrite)</Label>
                <p className="text-xs text-muted-foreground leading-tight">
                    Jika dicentang: Sel kosong di CSV akan <b>menghapus</b> data di sistem.<br/>
                    Jika tidak: Sel kosong diabaikan (Data lama tetap ada).
                </p>
            </div>
        </div>

        <Label
        htmlFor={`csvFile-${activeTab}`}
        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer ${
            isDragging
            ? "border-primary bg-primary/10"
            : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
        } ${isLoading ? "cursor-not-allowed opacity-50" : ""}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        >
        {selectedFile ? (
            <div className="flex flex-col items-center p-2 text-center">
            <FileSpreadsheet className="w-8 h-8 text-green-500 mb-2" />
            <p className="font-medium text-sm">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 h-6 text-red-500 hover:text-red-700"
                onClick={(e) => { e.preventDefault(); resetState(); }}
            >
                <X className="w-3 h-3 mr-1" /> Ganti
            </Button>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
            <UploadCloud className="w-8 h-8 mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Klik atau tarik file CSV di sini</p>
            </div>
        )}
        <Input
            id={`csvFile-${activeTab}`}
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
            disabled={isLoading}
        />
        </Label>
    </div>
  );

  return (
    <DialogContent className="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>Impor Massal Material (Smart Import)</DialogTitle>
        <DialogDescription>
          {isPreviewing 
            ? "Periksa & Edit data sebelum impor. Kolom berwarna dapat diedit." 
            : "Mendukung impor parsial. Kolom yang hilang tidak akan merubah data lama."}
        </DialogDescription>
      </DialogHeader>

      <div className="py-2">
        {!isPreviewing ? (
            
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                <TabsTrigger value="consumable">Consumable</TabsTrigger>
                <TabsTrigger value="option">Option</TabsTrigger>
                <TabsTrigger value="special">Special Consumable</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Format Wajib: Kode Material.
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 border-dashed"
                    onClick={handleDownloadTemplate}
                    >
                    <Download className="w-4 h-4" /> Template {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </Button>
                </div>

                <TabsContent value="kanban" className="mt-0"><UploadArea /></TabsContent>
                <TabsContent value="consumable" className="mt-0"><UploadArea /></TabsContent>
                <TabsContent value="option" className="mt-0"><UploadArea /></TabsContent>
                <TabsContent value="special" className="mt-0"><UploadArea /></TabsContent>

                {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-center gap-2 border border-red-200">
                    <AlertCircle className="w-4 h-4 flex-shrink-0"/>
                    <span>{error}</span>
                </div>
                )}
            </div>
            </Tabs>
        ) : (
            
            <div className="space-y-4">
                <div className="flex justify-between items-center bg-blue-50 p-3 rounded-md border border-blue-200">
                    <div className="text-sm text-blue-800">
                        Total Data Siap Impor: <strong>{validPayloads.length}</strong>
                    </div>
                    {overwriteBlank ? (
                        <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200 font-medium">
                            ⚠️ Mode Overwrite: ON (Sel kosong akan menghapus data)
                        </div>
                    ) : (
                         <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                            Mode Overwrite: OFF (Sel kosong diabaikan)
                        </div>
                    )}
                </div>

                <div className="border rounded-md overflow-hidden max-h-[400px] overflow-y-auto relative">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-2 border-b font-semibold text-gray-700">Material</th>
                                <th className="p-2 border-b font-semibold text-gray-700">Deskripsi</th>
                                <th className="p-2 border-b font-semibold text-gray-700">Lokasi</th>
                                <th className="p-2 border-b font-semibold text-gray-700">Pack Qty</th>
                                <th className="p-2 border-b font-semibold text-gray-700">Max Qty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {validPayloads.slice(0, 100).map((p, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 group">
                              {}
                              <td className="p-2 font-mono font-medium text-gray-700 bg-gray-50/50">
                                {p.material}
                              </td>

                              {}
                              <td className="p-1">
                                <Input
                                  className={`h-8 text-xs ${
                                    p.materialDescription === undefined 
                                      ? "border-dashed border-gray-300 bg-gray-50 placeholder:text-gray-400" 
                                      : (p.materialDescription === "" && overwriteBlank)
                                        ? "border-red-200 bg-red-50 placeholder:text-red-400 placeholder:font-light" 
                                        : "bg-white"
                                  }`}
                                  placeholder={
                                    p.materialDescription === undefined 
                                      ? "Tetap (No Change)" 
                                      : (overwriteBlank && p.materialDescription === "") ? "Data berubah menjadi blank" : ""
                                  }
                                  value={p.materialDescription ?? ""}
                                  onChange={(e) => handlePreviewChange(idx, "materialDescription", e.target.value)}
                                />
                              </td>

                              {}
                              <td className="p-1">
                                <Input
                                  className={`h-8 text-xs ${
                                    p.lokasi === undefined 
                                      ? "border-dashed border-gray-300 bg-gray-50 placeholder:text-gray-400"
                                      : (p.lokasi === "" && overwriteBlank)
                                        ? "border-red-200 bg-red-50 placeholder:text-red-400 placeholder:font-light"
                                        : "bg-white"
                                  }`}
                                  placeholder={
                                    p.lokasi === undefined 
                                      ? "Tetap (No Change)" 
                                      : (overwriteBlank && p.lokasi === "") ? "Data berubah menjadi blank" : ""
                                  }
                                  value={p.lokasi ?? ""}
                                  onChange={(e) => handlePreviewChange(idx, "lokasi", e.target.value)}
                                />
                              </td>

                              {}
                              <td className="p-1 w-24">
                                <Input
                                  type="number"
                                  className={`h-8 text-xs ${
                                    p.packQuantity === undefined 
                                     ? "border-dashed border-gray-300 bg-gray-50 placeholder:text-gray-400 font-light" 
                                     : "bg-white"
                                  }`}
                                  placeholder={p.packQuantity === undefined ? "Tetap" : "0"}
                                  value={p.packQuantity === undefined ? "" : p.packQuantity}
                                  onChange={(e) => handlePreviewChange(idx, "packQuantity", e.target.value)}
                                />
                              </td>

                              {}
                              <td className="p-1 w-24">
                                <Input
                                  type="number"
                                  className={`h-8 text-xs ${
                                    p.maxBinQty === undefined
                                      ? "border-dashed border-gray-300 bg-gray-50 placeholder:text-gray-400 font-light"
                                      : "bg-white"
                                  }`}
                                  placeholder={p.maxBinQty === undefined ? "Tetap" : "0"}
                                  value={p.maxBinQty === undefined ? "" : p.maxBinQty}
                                  onChange={(e) => handlePreviewChange(idx, "maxBinQty", e.target.value)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                    </table>
                    {validPayloads.length > 100 && (
                        <div className="p-2 text-center text-xs text-gray-500 bg-gray-50 border-t">
                            ... dan {validPayloads.length - 100} data lainnya
                        </div>
                    )}
                </div>
            </div>
        )}

        {}
        {validationRows.length > 0 && !isPreviewing && (
            <div className="mt-4 bg-red-50 border border-red-300 text-red-800 text-sm rounded-md p-3 max-h-60 overflow-y-auto">
            <p className="font-semibold mb-2 text-xs">Perbaiki {validationRows.length} baris (Simpan untuk konfirmasi):</p>
            <table className="w-full text-xs border-collapse">
                <thead>
                <tr className="bg-red-100 text-left">
                    <th className="p-1">Kode</th>
                    <th className="p-1">{activeTab === "kanban" || activeTab === "special" ? "Max Qty" : "Total Bins"}</th>
                    <th className="p-1">{activeTab === "kanban" || activeTab === "special" ? "Pack Qty" : "Qty/Bin"}</th>
                    <th className="p-1">Pesan</th>
                    <th className="p-1 text-center">Aksi</th>
                </tr>
                </thead>
                <tbody>
                {validationRows.map((row, i) => (
                    <tr key={row.rowNum} className="border-t border-red-200">
                    <td className="p-1 font-mono">{row.materialCode}</td>
                    <td className="p-1">
                        <input type="number" className="w-16 border border-red-300 rounded p-0.5 bg-white" value={row.col1} onChange={(e) => handleEditField(i, "col1", e.target.value)} />
                    </td>
                    <td className="p-1">
                        <input type="number" className="w-16 border border-red-300 rounded p-0.5 bg-white" value={row.col2} onChange={(e) => handleEditField(i, "col2", e.target.value)} />
                    </td>
                    <td className="p-1 text-red-700">{row.message}</td>
                    <td className="p-1 text-center">
                        <Button variant="default" size="sm" className="h-6 text-[10px] px-2 bg-[#008A15] hover:bg-green-700 text-white font-light" onClick={() => handleRevalidateRow(i)}>Simpan</Button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}

        {isLoading && (
            <div className="mt-4 space-y-1">
            <Progress value={uploadPercent} className="w-full h-2" />
            <p className="text-xs text-center text-muted-foreground">{progress}</p>
            </div>
        )}
      </div>

      <DialogFooter className="justify-between sm:justify-between">
        {!isPreviewing ? (
             <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
             >
                Batal
             </Button>
        ) : (
            <Button
                variant="outline"
                onClick={() => setIsPreviewing(false)} 
                disabled={isLoading}
                className="gap-2"
             >
                <ArrowLeft className="w-4 h-4"/> Kembali & Edit
             </Button>
        )}

        {!isPreviewing ? (
             validationRows.length > 0 ? (
                <Button disabled className="opacity-70 cursor-not-allowed bg-red-100 text-red-700 hover:bg-red-100">
                    Perbaiki Data Dulu
                </Button>
             ) : (
                <Button onClick={handleAnalyze} disabled={isLoading || !selectedFile}>
                    {isLoading ? "Memproses..." : "Analisis Data"}
                </Button>
             )
        ) : (
            <Button
                onClick={handleFinalImport}
                disabled={isLoading}
                className="bg-[#008A15] hover:bg-green-700 text-white gap-2 font-light"
            >
                {isLoading ? "Mengimpor..." : `Eksekusi Impor (${validPayloads.length})`}
                {!isLoading && <ArrowRight className="w-4 h-4"/>}
            </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}