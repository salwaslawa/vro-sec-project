"use client";

import { useState, useRef, KeyboardEvent, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label"; 
import {
  MaterialStatusResponse,
  useAuthStore,
} from "@/lib/types";

const formatBinId = (id: number | null): string => {
  if (id === null) return "";
  return id.toString().padStart(2, "0");
};

// ============================================================================
// BIN PREVIEW COMPONENT
// ============================================================================

interface BinPreviewProps {
  baseData: MaterialStatusResponse;
  simulatedBins: Map<number, number>;
  simulatedTotal: number;
}

function BinPreview({ baseData, simulatedBins, simulatedTotal }: BinPreviewProps) {
  const { maxBinQty, packQuantity, quantityPerBin, productType } = baseData;

  const current = simulatedTotal;
  const shortagePoint = Math.ceil(maxBinQty * 0.3);
  const preshortagePoint = Math.ceil(maxBinQty * 0.6);

  let overallColorClass = "bg-green-500";
  if (current <= shortagePoint) overallColorClass = "bg-red-500";
  else if (current <= preshortagePoint) overallColorClass = "bg-yellow-500";
  if (current < 0 || current > maxBinQty) overallColorClass = "bg-destructive";

  // --- LOGIC GENERATE KOTAK (Pack atau Bin) ---
  let totalSegments = 0;
  let qtyPerSegment = 0;

  // Cek apakah Special ATAU Kanban
  if (productType === 'special') {
      // Logic Special: Hitung jumlah Pack virtual
      if (packQuantity <= 0) return <BinPreviewSkeleton />;
      qtyPerSegment = packQuantity;
      totalSegments = Math.floor(maxBinQty / packQuantity);
  } else {
      // Logic Kanban/Option (Bin Fisik)
      if (baseData.bins && baseData.bins.length > 0) {
          totalSegments = baseData.bins.length;
          qtyPerSegment = baseData.bins[0].maxBinStock;
      } else {
          // Fallback jika data bin belum ada
          if (packQuantity <= 0) return <BinPreviewSkeleton />;
          qtyPerSegment = quantityPerBin || packQuantity;
          totalSegments = Math.floor(maxBinQty / packQuantity);
      }
  }

  if (totalSegments === 0 || qtyPerSegment <= 0) {
    return <BinPreviewSkeleton />;
  }
  
  const binIds = Array.from({ length: totalSegments }, (_, i) => i + 1);
  const isSpecial = productType === 'special';

  return (
    <div className="w-full min-w-[150px]">
      {/* HEADER */}
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className={current < 0 || current > maxBinQty ? "text-destructive font-bold" : ""}>
          Stok: {current} / {maxBinQty}
        </span>
        <span className="text-gray-500">
            {/* Tampilkan totalSegments + Pack/Bin */}
            {isSpecial ? `(${totalSegments} Pack)` : `(${totalSegments} Bin)`}
        </span>
      </div>

      {/* VISUAL BAR (KOTAK-KOTAK) */}
      <div className="flex space-x-1 h-3">
        {binIds.map((binId) => {
          const binStock = simulatedBins.get(binId) || 0;
          let percent = (binStock / qtyPerSegment) * 100;
          
          if (current < 0) percent = 100; 

          return (
            <div
              key={binId}
              className="relative flex-1 h-full bg-gray-200 rounded-sm overflow-hidden border border-gray-300/50"
              title={`${isSpecial ? 'Pack' : 'Bin'} ${formatBinId(binId)}: ${binStock}`}
            >
              {percent > 0 && (
                <div
                  className={`absolute top-0 left-0 h-full transition-all ${overallColorClass}`}
                  style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER LABEL (P... atau B...) */}
      <div className="flex space-x-1 mt-1">
        {binIds.map((binId) => {
          const currentBinStock = simulatedBins.get(binId) || 0;
          const isFilled = currentBinStock > 0; 

          return (
            <div key={binId} className="flex-1 text-center font-mono text-[10px] leading-tight">
              <div className="text-gray-500 text-[9px]">
                  {/* Label P untuk Special, B untuk lainnya */}
                  {isSpecial ? 'P' : 'B'}{formatBinId(binId)}
              </div>
              <span className={isFilled ? "font-bold text-black" : "text-gray-300"}>
                {currentBinStock}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BinPreviewSkeleton() {
  return (
    <div className="w-full min-w-[150px] animate-pulse">
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className="h-3 w-1/2 bg-gray-200 rounded"></span>
        <span className="h-3 w-1/4 bg-gray-200 rounded"></span>
      </div>
      <div className="flex space-x-1 h-3">
        <div className="flex-1 h-full bg-gray-200 rounded-sm" />
        <div className="flex-1 h-full bg-gray-200 rounded-sm" />
        <div className="flex-1 h-full bg-gray-200 rounded-sm" />
        <div className="flex-1 h-full bg-gray-200 rounded-sm" />
      </div>
    </div>
  );
}

// ============================================================================
// PARSING LOGIC
// ============================================================================

type ScanFormat = "IN" | "OUT_DEFAULT" | "OUT_EXPLICIT";

interface ParsedScan {
  raw: string;
  materialCode: string | null;
  binId: number | null;
  movement: "IN" | "OUT" | null;
  quantity: number | null;
  format: ScanFormat | null;
  error: string | null;
}

const parseRawScan = (rawCode: string): ParsedScan => {
  const code = rawCode.trim();
  const parts = code.split("_");
  const len = parts.length;

  if (len < 2) {
    if (code === "")
      return {
        raw: code,
        materialCode: null,
        binId: null,
        movement: null,
        quantity: null,
        format: null,
        error: null,
      };
    return {
      raw: code,
      materialCode: parts[0],
      binId: null,
      movement: null,
      quantity: null,
      format: null,
      error: "Format scan tidak lengkap (cth: MAT_IN atau MAT_IN_01)",
    };
  }

  const materialCode = parts[0];
  const movementStr = parts[1].toUpperCase();

  // VALIDASI MOVEMENT
  if (movementStr !== "IN" && movementStr !== "OUT") {
      return {
        raw: code,
        materialCode: materialCode,
        binId: null,
        movement: null,
        quantity: null,
        format: null,
        error: `Movement salah: ${movementStr} (harus IN atau OUT)`,
      };
  }
  const movement = movementStr as "IN" | "OUT";

  // KASUS 2 SEGMEN: MAT_IN atau MAT_OUT
  // Default Bin = 1
  if (len === 2) {
      return {
          raw: code,
          materialCode,
          binId: 1, // Default ke Bin 01
          movement,
          quantity: null,
          format: movement === "IN" ? "IN" : "OUT_DEFAULT",
          error: null,
      };
  }

  // KASUS 3+ SEGMEN: MAT_IN_BIN atau MAT_OUT_BIN[_QTY]
  const binIdStr = parts[2];
  const binId = parseInt(binIdStr, 10);

  if (isNaN(binId) || binId <= 0) {
    return {
      raw: code,
      materialCode,
      binId: null,
      movement,
      quantity: null,
      format: null,
      error: `Bin ID salah: ${binIdStr}`,
    };
  }

  if (movement === "IN") {
      // IN tidak butuh quantity
      return {
        raw: code,
        materialCode,
        binId,
        movement: "IN",
        quantity: null,
        format: "IN",
        error: null,
      };
  }

  if (movement === "OUT") {
    if (len === 3) {
      // MAT_OUT_BIN
      return {
        raw: code,
        materialCode,
        binId,
        movement: "OUT",
        quantity: null,
        format: "OUT_DEFAULT",
        error: null,
      };
    }
    if (len === 4) {
      // MAT_OUT_BIN_QTY
      const qtyStr = parts[3];
      const quantity = parseInt(qtyStr, 10);
      if (isNaN(quantity) || quantity <= 0) {
        return {
          raw: code,
          materialCode,
          binId,
          movement: "OUT",
          quantity: null,
          format: "OUT_EXPLICIT",
          error: `Qty salah: ${qtyStr}`,
        };
      }
      return {
        raw: code,
        materialCode,
        binId,
        movement: "OUT",
        quantity,
        format: "OUT_EXPLICIT",
        error: null,
      };
    }
  }

  return {
    raw: code,
    materialCode,
    binId: null,
    movement: null,
    quantity: null,
    format: null,
    error: "Format terlalu panjang",
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type ScanEntry = {
  id: number;
  rawScan: string;
  status: "idle" | "loading" | "success" | "error";

  baseData: MaterialStatusResponse | null;
  simulatedBins: Map<number, number>;
  simulatedTotal: number;

  predictedMovement: "IN" | "OUT" | null;
  predictedBinId: number | null;
  predictedQtyPcs: number | null;

  showQtyInput: boolean;
  qtyInputLabel: "Packs" | "PCS" | null;
  inputQty: string;

  finalRawScan: string;
  errorMessage: string | null;
  parsed: ParsedScan;
};

interface ScanMaterialModalProps {
  setIsOpen: (open: boolean) => void;
  onScansSaved: () => void;
}

const newEmptyScan = (): ScanEntry => ({
  id: Date.now(),
  rawScan: "",
  status: "idle",
  baseData: null,
  simulatedBins: new Map<number, number>(),
  simulatedTotal: 0,
  predictedMovement: null,
  predictedBinId: null,
  predictedQtyPcs: null,
  showQtyInput: false,
  qtyInputLabel: null,
  inputQty: "1",
  finalRawScan: "",
  errorMessage: null,
  parsed: parseRawScan(""),
});

export function AutoScanMaterialModal({
  setIsOpen,
  onScansSaved,
}: ScanMaterialModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const username = useAuthStore((state) => state.username);
  const role = useAuthStore((state) => state.role);
  const companyName = useAuthStore((state) => state.companyName);
  const [error, setError] = useState<string | null>(null);
  const [scans, setScans] = useState<ScanEntry[]>([newEmptyScan()]);
  const inputRefs = useRef<Map<number, HTMLInputElement | null>>(new Map());

  
  const validateAndFetchGroup = useCallback(
    async (materialCodeToValidate: string) => {
      setScans((prev) =>
        prev.map((s) => {
          if (s.parsed.materialCode === materialCodeToValidate) {
            return { ...s, status: "loading", errorMessage: null };
          }
          return s;
        })
      );

      let baseData: MaterialStatusResponse;
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/materials/status?code=${materialCodeToValidate}`,
          {
            headers: {
              "X-User-Role": role || "",
              "X-User-Company": companyName || "",
              "X-User-Username": username || "",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Material tidak ditemukan: ${materialCodeToValidate}`
          );
        }

        baseData = await response.json();
        
        if (baseData.productType === "kanban" && !baseData.quantityPerBin) {
          baseData.quantityPerBin = baseData.packQuantity;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Gagal memuat";
        setScans((prev) =>
          prev.map((s) => {
            if (s.parsed.materialCode === materialCodeToValidate) {
              return {
                ...s,
                status: "error",
                errorMessage: errorMessage,
                baseData: null,
              };
            }
            return s;
          })
        );
        return;
      }
      
      let runningQuantity = baseData.currentQuantity;
      let runningOpenPO = baseData.openPO; 
      let runningVendorStock = baseData.vendorStock; 

      const simulatedBins = new Map<number, number>();

      if (baseData.bins && baseData.bins.length > 0) {
        baseData.bins.forEach((b) => {
          simulatedBins.set(b.binSequenceId, b.currentBinStock);
        });
      } else {
        const totalSegments = Math.floor(baseData.maxBinQty / baseData.packQuantity) || 1;
        if (baseData.productType?.toLowerCase() === 'special') {
           let visualRem = runningQuantity;
           for (let i = 1; i <= totalSegments; i++) {
                if (visualRem >= baseData.packQuantity) {
                    simulatedBins.set(i, baseData.packQuantity);
                    visualRem -= baseData.packQuantity;
                } else if (visualRem > 0) {
                    simulatedBins.set(i, visualRem);
                    visualRem = 0;
                } else {
                    simulatedBins.set(i, 0);
                }
           }
        } else {
           for (let i = 1; i <= totalSegments; i++) {
                simulatedBins.set(i, 0);
           }
        }
      }

      setScans((prev) => {
        return prev.map((scan) => {
          if (scan.parsed.materialCode !== materialCodeToValidate) {
            return scan;
          }

          const { packQuantity, maxBinQty, quantityPerBin } = baseData;
          const productType = baseData.productType.toLowerCase(); 
          
          const parsed = scan.parsed;
          let rowError: string | null = parsed.error;

          const predictedMovement = parsed.movement;
          const predictedBinId = parsed.binId;
          const formattedBin = formatBinId(predictedBinId); 

          if (predictedBinId !== null) {
            let maxAllowedBinId = 0;
            if (baseData.bins && baseData.bins.length > 0) {
                 maxAllowedBinId = Math.max(...baseData.bins.map(b => b.binSequenceId));
            } else {
                 maxAllowedBinId = Math.floor(maxBinQty / packQuantity);
                 if (maxAllowedBinId === 0) maxAllowedBinId = 99;
            }
            
            // Special biasanya virtual, jadi validasi bin fisik mungkin tidak relevan jika di-scan 01
            // Tapi jika scan 999 padahal max segment 10, tetap validasi
            if (predictedBinId > maxAllowedBinId && productType !== 'special') {
                rowError = `Bin ${formattedBin} tidak ada. (Maksimal: ${formatBinId(maxAllowedBinId)})`;
            }
          }

          let predictedQtyPcs: number | null = null;
          let inputQty: string = scan.inputQty;
          let showQtyInput: boolean = false;
          let qtyInputLabel: "Packs" | "PCS" | null = null;
          let finalRawScan: string = scan.rawScan; 

          if (!rowError && parsed.format && predictedBinId !== null) {
            if (parsed.format === "IN") {
              // IN
              predictedQtyPcs = (productType === 'special') ? packQuantity : quantityPerBin;
              finalRawScan = `${parsed.materialCode}_IN_${formattedBin}`; 

            } else if (parsed.format === "OUT_DEFAULT") {
              // OUT tanpa quantity (misal PART_OUT atau PART_OUT_01)
              if (scan.inputQty === "1") inputQty = "1";

              if (productType === "kanban") {
                predictedQtyPcs = quantityPerBin;
                finalRawScan = `${parsed.materialCode}_OUT_${formattedBin}`;
              } else if (productType === "special") {
                // SPECIAL langsung 1 Pack, tidak perlu tanya qty
                predictedQtyPcs = packQuantity;
                finalRawScan = `${parsed.materialCode}_OUT_${formattedBin}_1`; 
              } else if (productType === "consumable" || productType === "option") {
                // CONSUMABLE/OPTION langsung 1 Pack, tidak perlu tanya qty (PERUBAHAN DISINI)
                predictedQtyPcs = packQuantity;
                finalRawScan = `${parsed.materialCode}_OUT_${formattedBin}_1`;
              }

            } else if (parsed.format === "OUT_EXPLICIT") {
              // OUT dengan quantity (misal PART_OUT_01_05)
              const explicitQty = parsed.quantity!;
              inputQty = String(explicitQty);
              finalRawScan = `${parsed.materialCode}_OUT_${formattedBin}_${explicitQty}`;

              if (productType === "kanban") {
                rowError = "Format 4-bagian (dgn Qty) tidak valid untuk Kanban.";
              } else if (productType === "special" || productType === "consumable" || productType === "option") {
                // Jika user explicit scan Qty, kita terima saja, tidak perlu showQtyInput lagi
                predictedQtyPcs = explicitQty * packQuantity;
              }
            }
          }

          let newTotalQuantity = runningQuantity;
          
          if (!rowError && predictedQtyPcs !== null && predictedBinId !== null) {
            // ... (Logika kalkulasi stok sama seperti sebelumnya)
            if (productType === 'special') {
                if (predictedMovement === "IN") {
                    if (runningVendorStock < predictedQtyPcs) {
                        rowError = `Vendor Stock tidak cukup (Sisa: ${runningVendorStock}, Butuh: ${predictedQtyPcs})`;
                    }
                    if (!rowError && runningOpenPO < predictedQtyPcs) {
                        rowError = `Open PO tidak cukup (Sisa: ${runningOpenPO}, Butuh: ${predictedQtyPcs})`;
                    }
                    if (!rowError) {
                        newTotalQuantity += predictedQtyPcs;
                        if (newTotalQuantity > maxBinQty) {
                             rowError = `Stok melebihi Max (${newTotalQuantity} / ${maxBinQty})`;
                        } else {
                             runningQuantity = newTotalQuantity;
                             runningVendorStock -= predictedQtyPcs;
                             runningOpenPO -= predictedQtyPcs;
                        }
                    }
                } else {
                    if (runningQuantity < predictedQtyPcs) {
                        rowError = `Stok Total kurang (Sisa: ${runningQuantity}, Butuh: ${predictedQtyPcs})`;
                    }
                    if (!rowError) {
                         newTotalQuantity -= predictedQtyPcs;
                         runningQuantity = newTotalQuantity;
                    }
                }

                if (!rowError) {
                    let visualRem = runningQuantity;
                    const totalSegments = Math.floor(maxBinQty / packQuantity) || 1;
                    simulatedBins.clear(); 
                    for (let i = 1; i <= totalSegments; i++) {
                        if (visualRem >= packQuantity) {
                            simulatedBins.set(i, packQuantity);
                            visualRem -= packQuantity;
                        } else if (visualRem > 0) {
                            simulatedBins.set(i, visualRem);
                            visualRem = 0;
                        } else {
                            simulatedBins.set(i, 0);
                        }
                    }
                }

            } else {
                // NON-SPECIAL (Fisik)
                const currentBinStock = simulatedBins.get(predictedBinId) || 0;

                if (predictedMovement === "IN") {
                  if (currentBinStock > 0) {
                      rowError = `Bin ${formattedBin} sudah terisi (stok: ${currentBinStock})`;
                  }
                  if (!rowError && runningVendorStock < predictedQtyPcs) {
                      rowError = `Vendor Stock tidak cukup (Sisa: ${runningVendorStock}, Butuh: ${predictedQtyPcs})`;
                  }
                  if (!rowError && runningOpenPO < predictedQtyPcs) {
                      rowError = `Open PO tidak cukup (Sisa: ${runningOpenPO}, Butuh: ${predictedQtyPcs})`;
                  }
                  if (!rowError) {
                    newTotalQuantity += predictedQtyPcs;
                    if (newTotalQuantity > maxBinQty) {
                      rowError = `Stok melebihi Max (${newTotalQuantity} / ${maxBinQty})`;
                    } else {
                      runningQuantity = newTotalQuantity;
                      runningVendorStock -= predictedQtyPcs;
                      runningOpenPO -= predictedQtyPcs;
                      simulatedBins.set(predictedBinId, predictedQtyPcs);
                    }
                  }
                } else {
                  if (currentBinStock === 0) {
                      rowError = `Bin ${formattedBin} sudah kosong`;
                  } else if (currentBinStock < predictedQtyPcs) {
                      rowError = `Stok Bin ${formattedBin} kurang (sisa ${currentBinStock}, butuh ${predictedQtyPcs})`;
                  }
                  if (!rowError) {
                      newTotalQuantity -= predictedQtyPcs;
                      if (newTotalQuantity < 0) {
                        rowError = `Stok Total kurang dari 0 (${newTotalQuantity})`;
                      } else {
                        runningQuantity = newTotalQuantity;
                        simulatedBins.set(
                            predictedBinId,
                            currentBinStock - predictedQtyPcs
                        );
                      }
                  }
                }
            } 
          }

          return {
            ...scan,
            status: rowError ? "error" : "success",
            baseData: baseData,
            simulatedBins: new Map(simulatedBins),
            simulatedTotal: runningQuantity,
            predictedMovement,
            predictedBinId,
            predictedQtyPcs,
            showQtyInput,
            qtyInputLabel,
            inputQty: rowError ? scan.inputQty : inputQty,
            finalRawScan: rowError ? "" : finalRawScan,
            errorMessage: rowError,
          };
        });
      });
    },
    [role, companyName, username]
  );

  // ... (Sisa kode handler, useEffect, dll sama) ...
  const [groupToRevalidate, setGroupToRevalidate] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (groupToRevalidate) {
      validateAndFetchGroup(groupToRevalidate);
      setGroupToRevalidate(null);
    }
  }, [groupToRevalidate, validateAndFetchGroup]);

  const setInputRef = (id: number, element: HTMLInputElement | null) => {
    if (element) {
      inputRefs.current.set(id, element);
    } else {
      inputRefs.current.delete(id);
    }
  };

  const handleMaterialCodeChange = (id: number, newCode: string) => {
    setScans((prevScans) =>
      prevScans.map((scan) =>
        scan.id === id
          ? {
              ...newEmptyScan(),
              id: scan.id,
              rawScan: newCode,
              parsed: parseRawScan(newCode),
            }
          : scan
      )
    );
  };

  const handleQtyChange = (id: number, newQtyStr: string) => {
    // ... Logic qty change tetap ada untuk berjaga-jaga jika showQtyInput true ...
    setScans((prevScans) =>
      prevScans.map((scan) => {
        if (scan.id !== id || !scan.showQtyInput) {
          return scan;
        }
        if (newQtyStr === "") {
            return { ...scan, inputQty: "", errorMessage: "Qty harus diisi" };
        }
        const newQty = parseInt(newQtyStr, 10);
        const qtyValue = isNaN(newQty) ? 0 : newQty;
        let newPredictedQtyPcs = 0;
        if (scan.baseData) {
          const { productType, packQuantity } = scan.baseData;
          if (productType === "consumable" || productType === "option" || productType === "special") {
            newPredictedQtyPcs = qtyValue * packQuantity;
          }
        }
        const binStr = formatBinId(scan.parsed.binId);
        const newFinalRawScan = `${scan.parsed.materialCode}_OUT_${binStr}_${qtyValue <= 0 ? "" : qtyValue}`;
        return {
          ...scan,
          inputQty: newQtyStr,
          finalRawScan: newFinalRawScan,
          predictedQtyPcs: newPredictedQtyPcs,
          errorMessage: qtyValue <= 0 ? "Qty harus > 0" : null,
        };
      })
    );
  };

  // ====================================================================
  // PERBAIKAN DI SINI:
  // JANGAN UBAH FORMAT TAMPILAN JIKA INPUTNYA SUDAH VALID TAPI PENDEK
  // ====================================================================
  const handleBlur = (id: number) => {
    const scan = scans.find((s) => s.id === id);
    if (!scan) return;

    let newRawScan = scan.rawScan;
    if (scan.showQtyInput) {
        const qtyNum = parseInt(scan.inputQty, 10);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            setScans((prev) =>
                prev.map((s) =>
                    s.id === id
                        ? { ...s, status: "error", errorMessage: "Qty tidak valid", baseData: null }
                        : s
                )
            );
            return;
        }
        const binStr = formatBinId(scan.parsed.binId);
        newRawScan = `${scan.parsed.materialCode}_OUT_${binStr}_${qtyNum}`;
    } else {
        // PERBAIKAN: Cek jumlah segmen string
        const segments = newRawScan.trim().split('_');

        // Jika user mengetik format pendek (hanya 2 segmen, misal: PART_IN),
        // JANGAN direformat menjadi PART_IN_01. Biarkan seperti adanya.
        // Reformatting hanya dilakukan jika user mengetik Bin (segmen > 2)
        // atau jika ada kesalahan parsing lainnya.
        if (segments.length > 2) {
            const tempParsed = parseRawScan(newRawScan);
            if (tempParsed.binId !== null && !tempParsed.error && tempParsed.materialCode) {
                 const binStr = formatBinId(tempParsed.binId);
                 newRawScan = `${tempParsed.materialCode}_${tempParsed.movement}_${binStr}`;
                 if (tempParsed.quantity) {
                    newRawScan += `_${tempParsed.quantity}`;
                 }
            }
        }
    }

    const reParsed = parseRawScan(newRawScan);
    let needsStateUpdate = false;
    if (scan.rawScan !== newRawScan || scan.parsed.error !== reParsed.error) {
      needsStateUpdate = true;
    }
    const codeToRevalidate = reParsed.materialCode;
    if (codeToRevalidate) {
      if (needsStateUpdate) {
        setScans((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, rawScan: newRawScan, parsed: reParsed } : s
          )
        );
      }
      setGroupToRevalidate(codeToRevalidate);
    }
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    currentId: number,
    currentIndex: number
  ) => {
    if ((e.key === "Tab" && !e.shiftKey) || (e.key === "Enter" && !e.shiftKey)) {
      if ((e.target as HTMLElement).id.startsWith("qty-")) {
        return;
      }
      if (currentIndex === scans.length - 1) {
        const currentScan = scans[currentIndex];
        if (currentScan.rawScan.trim() !== "") {
          e.preventDefault();
          setScans((prev) => [...prev, newEmptyScan()]);
        }
      }
    }
  };

  useEffect(() => {
    if (scans.length > 0) {
      const lastScan = scans[scans.length - 1];
      if (lastScan.rawScan === "" && lastScan.status === "idle") {
        setTimeout(() => {
          inputRefs.current.get(lastScan.id)?.focus();
        }, 0);
      }
    }
  }, [scans.length]);

  const handleDeleteScan = (id: number) => {
    const scanToDelete = scans.find((s) => s.id === id);
    const codeToRevalidate = scanToDelete?.parsed.materialCode;
    setScans((prev) => {
      const newScans = prev.filter((scan) => scan.id !== id);
      if (newScans.length === 0) return [newEmptyScan()];
      return newScans;
    });
    if (codeToRevalidate) {
      const needsRevalidation = scans.some(
        (s) => s.id !== id && s.parsed.materialCode === codeToRevalidate
      );
      if (needsRevalidation) setGroupToRevalidate(codeToRevalidate);
    }
  };

  const handleSubmit = async () => {
    const stillLoading = scans.some((s) => s.status === "loading");
    if (stillLoading) {
      setError("Harap tunggu semua validasi material selesai.");
      return;
    }
    const anyErrors = scans.some(
      (s) => s.status === "error" && s.rawScan.trim() !== ""
    );
    if (anyErrors) {
      setError("Error: Terdapat baris dengan error. Harap perbaiki atau hapus.");
      return;
    }
    const invalidQty = scans.some(
      (s) => s.showQtyInput && (s.inputQty === "" || parseInt(s.inputQty, 10) <= 0)
    );
    if (invalidQty) {
      setError("Error: Kuantitas (Packs/PCS) harus diisi dan lebih dari 0.");
      return;
    }
    const validScans = scans.filter(
      (s) => s.status === "success" && s.predictedMovement && s.finalRawScan
    );
    if (validScans.length === 0) {
      setError("Tidak ada data scan valid (status 'success') untuk disimpan.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const payload: string[] = validScans.map((s) => s.finalRawScan.trim());
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/materials/scan/auto`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Role": role || "",
            "X-User-Company": companyName || "",
            "X-User-Username": username || "",
          },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menyimpan scan.");
      }
      onScansSaved();
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving scans:", error);
      setError(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  const getMovementText = (scan: ScanEntry) => {
    if (scan.status !== "success") return null;
    const { predictedMovement, predictedQtyPcs, predictedBinId, baseData } = scan;
    const binDisplay = formatBinId(predictedBinId);
    
    const isSpecial = baseData?.productType?.toLowerCase() === 'special';
    if (isSpecial) {
         if (predictedMovement === "IN") return `+${predictedQtyPcs} pcs (IN Special)`;
         return `-${predictedQtyPcs} pcs (OUT Special)`;
    }
    if (predictedMovement === "IN") {
      return `+${predictedQtyPcs} pcs (IN, Bin ${binDisplay || "?"})`;
    }
    return `-${predictedQtyPcs} pcs (OUT, Bin ${binDisplay || "?"})`;
  };

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Scan Stok (Auto IN/OUT)</DialogTitle>
        <DialogDescription>
          Format Scan: [Material]_[IN/OUT] (Otomatis 1 Pack/Bin 01)
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[60vh] overflow-y-auto border rounded-md">
        <Table>
          <TableHeader className="sticky top-0 bg-secondary">
            <TableRow>
              <TableHead className="w-[40px] pl-3">#</TableHead>
              <TableHead>Material ID (Scan)</TableHead>
              <TableHead className="min-w-[200px]">Pergerakan Stok</TableHead>
              <TableHead className="w-[50px] text-right">Hapus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scans.map((scan, index) => (
              <TableRow
                key={scan.id}
                className={`${
                  scan.status === "error" ? "bg-destructive/10" : ""
                }`}
              >
                <TableCell className="p-1 pl-3 text-center text-sm text-muted-foreground align-top pt-3">
                  {index + 1}
                </TableCell>
                <TableCell className="p-1 align-top">
                  <Input
                    ref={(el) => setInputRef(scan.id, el)}
                    autoFocus={index === 0 && scans.length === 1}
                    value={scan.rawScan}
                    onChange={(e) =>
                      handleMaterialCodeChange(scan.id, e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, scan.id, index)}
                    onBlur={() => handleBlur(scan.id)}
                    placeholder="Scan..."
                    className={`border-none !ring-0 !ring-offset-0 focus-visible:ring-1 p-2 h-auto bg-transparent ${
                      scan.status === "error"
                        ? "text-destructive placeholder:text-destructive/60"
                        : ""
                    }`}
                  />
                </TableCell>
                <TableCell className="p-2 align-top">
                  {scan.status === "loading" && <BinPreviewSkeleton />}
                  {scan.status === "success" && scan.baseData && (
                    <div>
                      <BinPreview
                        baseData={scan.baseData}
                        simulatedBins={scan.simulatedBins}
                        simulatedTotal={scan.simulatedTotal}
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`flex-1 text-xs font-bold ${
                            scan.predictedMovement === "IN"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {getMovementText(scan)}
                        </span>
                        {scan.showQtyInput && (
                          <div className="space-y-1">
                            <Label
                              htmlFor={`qty-${scan.id}`}
                              className="text-xs"
                            >
                              Qty ({scan.qtyInputLabel})
                              {scan.qtyInputLabel === "Packs" &&
                                scan.baseData && (
                                  <span className="text-muted-foreground font-normal ml-1">
                                    (1 Pack = {scan.baseData.packQuantity} Pcs)
                                  </span>
                                )}
                            </Label>
                            <Input
                              id={`qty-${scan.id}`}
                              type="number"
                              value={scan.inputQty}
                              onChange={(e) =>
                                handleQtyChange(scan.id, e.target.value)
                              }
                              onKeyDown={(e) => handleKeyDown(e, scan.id, index)}
                              onBlur={() => handleBlur(scan.id)}
                              className="h-8 w-24 text-sm"
                              placeholder="Qty"
                              min="1"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {scan.status === "error" && (
                    <>
                      {scan.baseData && (
                        <BinPreview
                          baseData={scan.baseData}
                          simulatedBins={scan.simulatedBins}
                          simulatedTotal={scan.simulatedTotal}
                        />
                      )}
                      <span className="text-destructive font-bold text-xs mt-1 block">
                        {scan.errorMessage}
                      </span>
                    </>
                  )}
                </TableCell>
                <TableCell className="p-1 text-right align-top pt-2">
                  {(scans.length > 1 || scan.rawScan.trim() !== "") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 ${
                        scan.status === "error"
                          ? "text-destructive hover:bg-destructive/20"
                          : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      }`}
                      onClick={() => handleDeleteScan(scan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/50 text-destructive text-sm p-3 rounded-md text-center">
          {error}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => setIsOpen(false)}>
          Batal
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Menyimpan..." : "Simpan Transaksi"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}