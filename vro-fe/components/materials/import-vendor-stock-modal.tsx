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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/lib/types";
import Papa from "papaparse";
import { FileSpreadsheet, UploadCloud, X, Download, Check, Square } from "lucide-react";

interface ImportVendorStockModalProps {
  setIsOpen: (open: boolean) => void;
  onImportSuccess: () => void;
}

interface VendorStockPayload {
  materialCode: string;
  vendorStock?: number; 
  openPO?: number;      
  updateType?: "stock" | "open_po" | "both"; 
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export function ImportVendorStockModal({
  setIsOpen,
  onImportSuccess,
}: ImportVendorStockModalProps) {
  const [activeTab, setActiveTab] = useState<"stock" | "openpo">("stock");
  
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validPayloads, setValidPayloads] = useState<VendorStockPayload[]>([]);
  
  
  const [overwriteBlank, setOverwriteBlank] = useState(false);
  
  const authRole = useAuthStore((state) => state.role);
  const authCompany = useAuthStore((state) => state.companyName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (value: string) => {
    setActiveTab(value as "stock" | "openpo");
    handleRemoveFile();
  };

  const handleFileSelect = (file: File | undefined) => {
    setError(null);
    setValidPayloads([]);
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

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setValidPayloads([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleDownloadTemplate = () => {
    let headers = ["Material Code"];
    let dummyData = "\nCONTOH-MAT-01";

    if (activeTab === "stock") {
        headers.push("Vendor Stock");
        dummyData += ",100";
    } else {
        headers.push("Open PO");
        dummyData += ",50";
    }
    
    const csvContent = headers.join(",") + dummyData;
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `template-${activeTab === "stock" ? "vendor-stock" : "open-po"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleAnalyze = () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setProgress("Menganalisis file...");
    setError(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        const fields = (results.meta.fields || []).map((f) => f.trim());
        
        const requiredHeaders = ["Material Code"];
        if (activeTab === "stock") {
            requiredHeaders.push("Vendor Stock");
        } else {
            requiredHeaders.push("Open PO");
        }

        const missingHeaders = requiredHeaders.filter(h => !fields.includes(h));

        if (missingHeaders.length > 0) {
          setError(`Header CSV salah untuk tab ${activeTab === 'stock' ? 'Stock' : 'PO'}. Wajib ada: ${missingHeaders.join(", ")}`);
          setIsLoading(false);
          return;
        }

        const payloads: VendorStockPayload[] = [];
        let errorRows = 0;

        data.forEach((row) => {
           const code = row["Material Code"]?.trim();
           if (!code) return; 

           
           
           
           
           
           if (activeTab === "stock") {
               const rawStock = row["Vendor Stock"]?.trim();
               let vStock: number | undefined;

               if (!rawStock) {
                   
                   if (overwriteBlank) {
                       vStock = 0;
                   } else {
                       vStock = undefined; 
                   }
               } else {
                   
                   const parsed = parseInt(rawStock.replace(/[,.]/g, ""), 10);
                   if (isNaN(parsed)) {
                       errorRows++;
                       return;
                   }
                   vStock = parsed;
               }

               
               if (vStock !== undefined) {
                   payloads.push({
                       materialCode: code,
                       vendorStock: vStock,
                       
                   });
               }

           } else {
               
               const rawPO = row["Open PO"]?.trim();
               let openPO: number | undefined;

               if (!rawPO) {
                   if (overwriteBlank) {
                       openPO = 0;
                   } else {
                       openPO = undefined;
                   }
               } else {
                   const parsed = parseInt(rawPO.replace(/[,.]/g, ""), 10);
                   if (isNaN(parsed)) {
                       errorRows++;
                       return;
                   }
                   openPO = parsed;
               }

               if (openPO !== undefined) {
                   payloads.push({
                       materialCode: code,
                       
                       openPO: openPO,
                   });
               }
           }
        });

        if (payloads.length === 0) {
           setError(overwriteBlank 
             ? "Tidak ada data valid yang ditemukan." 
             : "Tidak ada data. (Mode Overwrite OFF: Sel kosong diabaikan).");
        } else if (errorRows > 0) {
           alert(`Peringatan: Ada ${errorRows} baris dengan format angka yang salah dan akan dilewati.`);
        }

        setValidPayloads(payloads);
        setIsLoading(false);
        setProgress("");
      },
      error: (err) => {
        setError(`Gagal membaca file: ${err.message}`);
        setIsLoading(false);
      }
    });
  };
  
  const handleFinalImport = async () => {
    if (validPayloads.length === 0) return;

    setIsLoading(true);
    setProgress("Sedang mengupdate database...");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/bulk-stock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": authRole || "",
          "X-User-Company": authCompany || "",
        },
        body: JSON.stringify(validPayloads),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Gagal melakukan update.");
      }

      let message = `Berhasil update ${json.updatedCount} material (${activeTab === 'stock' ? 'Vendor Stock' : 'Open PO'}).`;
      
      if (json.errors && json.errors.length > 0) {
        message += `\n\nGagal (${json.errors.length} item):\n` + json.errors.slice(0, 5).join("\n") + (json.errors.length > 5 ? "\n..." : "");
      }

      alert(message);
      onImportSuccess();
      setIsOpen(false);

    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
      setProgress("");
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Import Data Supplier</DialogTitle>
        <DialogDescription>
          Pilih kategori data yang ingin diupdate melalui file CSV.
        </DialogDescription>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stock">Supplier Stock</TabsTrigger>
          <TabsTrigger value="openpo">Open PO</TabsTrigger>
        </TabsList>

        <div className="grid gap-4 py-4 mt-2">
          
          {}
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
                <p className="text-[10px] text-muted-foreground leading-tight">
                    Jika dicentang: Sel kosong di CSV akan menjadi <b>0</b>.<br/>
                    Jika tidak: Sel kosong diabaikan (Data lama tetap ada).
                </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2 w-full border-dashed"
            onClick={handleDownloadTemplate}
          >
            <Download className="h-4 w-4" />
            Download Template CSV ({activeTab === "stock" ? "Stock" : "Open PO"})
          </Button>

          <Label
            htmlFor="csvFileVendor"
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-gray-300 hover:bg-gray-50 dark:border-gray-600"
            } ${isLoading ? "cursor-not-allowed opacity-50" : ""}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="flex flex-col items-center p-2 text-center">
                <FileSpreadsheet className="w-8 h-8 text-green-600 mb-2" />
                <p className="font-medium text-sm truncate max-w-[200px]">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-6 text-red-500 hover:text-red-700"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation(); 
                    handleRemoveFile();
                  }}
                >
                  <X className="w-3 h-3 mr-1" /> Ganti File
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <UploadCloud className="w-8 h-8 mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">
                  Klik atau tarik file CSV <b>{activeTab === "stock" ? "Stock" : "Open PO"}</b> ke sini
                </p>
              </div>
            )}
            <Input
              id="csvFileVendor"
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
              disabled={isLoading}
            />
          </Label>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
              {error}
            </div>
          )}

          {!error && validPayloads.length > 0 && (
            <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm border border-green-200 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>
                    Siap update <b>{validPayloads.length}</b> material 
                    <span className="text-xs ml-1 opacity-75">
                    ({activeTab === "stock" ? "Vendor Stock" : "Open PO"})
                    </span>
                </span>
              </div>
              <div className="text-[10px] ml-6 opacity-80">
                 Mode Overwrite: {overwriteBlank ? "ON (Menganggap blank menjadi 0)" : "OFF (Kosong = Skip)"}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="space-y-2">
              <Progress value={100} className="h-2 animate-pulse" />
              <p className="text-xs text-center text-muted-foreground">{progress}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Tutup
          </Button>
          {validPayloads.length > 0 ? (
            <Button onClick={handleFinalImport} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading ? "Memproses..." : "Update Sekarang"}
            </Button>
          ) : (
            <Button onClick={handleAnalyze} disabled={!selectedFile || isLoading}>
              Analisis File
            </Button>
          )}
        </DialogFooter>
      </Tabs>
    </DialogContent>
  );
}