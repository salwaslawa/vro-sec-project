"use client";

import { Material, MaterialBin } from "@/lib/types";
import { BinPreviewSkeleton } from "./bin-preview-skeleton";

interface BinPreviewProps {
  material: Material;
}

export function BinPreview({ material }: BinPreviewProps) {
  if (!material) return <BinPreviewSkeleton />;

  const {
    bins,
    packQuantity,
    maxBinQty,
    currentQuantity = 0,
    productType,
    id,
  } = material;

  let displayBins: MaterialBin[] = bins || [];

  // =====================================================================
  // GENERATE VIRTUAL SEGMENTS (Untuk Kanban & Special)
  // =====================================================================
  // Logic ini akan membuat kotak-kotak virtual berdasarkan Max / Pack
  if (
    (!displayBins || displayBins.length === 0) &&
    (productType === "kanban" || productType === "special") && 
    packQuantity > 0 &&
    maxBinQty > 0
  ) {
    const totalSegments = Math.ceil(maxBinQty / packQuantity);
    displayBins = [];
    let remainingStock = currentQuantity;

    for (let i = 1; i <= totalSegments; i++) {
      const maxStock = packQuantity;
      let currentStock = 0;

      // Distribusi stok ke kotak-kotak (virtual bins/packs)
      if (remainingStock >= maxStock) {
        currentStock = maxStock;
        remainingStock -= maxStock;
      } else if (remainingStock > 0) {
        currentStock = remainingStock;
        remainingStock = 0;
      }

      displayBins.push({
        id: i,
        materialId: id,
        binSequenceId: i,
        maxBinStock: maxStock,
        currentBinStock: currentStock,
      });
    }
  }

  // Jika setelah logic di atas displayBins masih kosong, return skeleton/empty
  if (!displayBins || displayBins.length === 0) {
    return <BinPreviewSkeleton />;
  }
  
  // =====================================================================
  // LOGIKA WARNA (Traffic Light System)
  // =====================================================================
  const shortagePoint = Math.ceil(maxBinQty * 0.3);
  const preshortagePoint = Math.ceil(maxBinQty * 0.6);

  let overallColorClass = "bg-green-500";
  if (currentQuantity <= shortagePoint) overallColorClass = "bg-red-500";
  else if (currentQuantity <= preshortagePoint)
    overallColorClass = "bg-yellow-500";
  if (currentQuantity < 0 || currentQuantity > maxBinQty)
    overallColorClass = "bg-destructive";

  return (
    <div className="w-full min-w-[150px]">
      {/* HEADER: Info Total Stok */}
      <div className="flex justify-between text-xs font-mono mb-1">
        <span
          className={
            currentQuantity < 0 || currentQuantity > maxBinQty
              ? "text-destructive font-bold"
              : ""
          }
        >
          Stok: {currentQuantity} / {maxBinQty}
        </span>
        <span className="text-gray-500">
            {/* Tampilkan info jumlah Pack atau Bin */}
            {productType === 'special' 
                ? `(${displayBins.length} Pack)` 
                : `(${displayBins.length} Bin)`}
        </span>
      </div>

      {/* VISUAL BAR (KOTAK-KOTAK) */}
      <div className="flex space-x-1 h-3">
        {displayBins.map((bin) => {
          const percent =
            bin.maxBinStock > 0
              ? (bin.currentBinStock / bin.maxBinStock) * 100
              : 0;

          return (
            <div
              key={bin.binSequenceId}
              className="relative flex-1 h-full bg-gray-200 rounded-sm overflow-hidden border border-gray-300/40"
              title={`${productType === 'special' ? 'Pack' : 'Bin'} ${bin.binSequenceId}: ${bin.currentBinStock}/${bin.maxBinStock}`}
            >
              {percent > 0 && (
                <div
                  className={`absolute top-0 left-0 h-full transition-all ${overallColorClass}`}
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER: LABEL NOMOR */}
      <div className="flex space-x-1 mt-1">
        {displayBins.map((bin) => {
          const isFilled = bin.currentBinStock > 0;
          return (
            <div
              key={bin.binSequenceId}
              className="flex-1 text-center font-mono text-[10px] leading-tight"
            >
              {/* Ubah Label: P untuk Pack (Special), B untuk Bin (Lainnya) */}
              <div className="text-gray-500 text-[9px]">
                {productType === "special" ? "P" : "B"}{bin.binSequenceId}
              </div>
              
              <span
                className={isFilled ? "font-bold text-black" : "text-gray-300"}
              >
                {/* Tampilkan angka stok */}
                {bin.currentBinStock}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}