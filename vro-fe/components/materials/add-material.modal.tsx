"use-client";

import { useState, useMemo, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Material, useAuthStore } from "@/lib/types";
import { BinPreview } from "./bin-preview";
import { Wand2 } from "lucide-react";

interface AddMaterialModalProps {
  setIsOpen: (open: boolean) => void;
  onMaterialAdded: (newMaterial: Material) => void;
}

const roundUpToPack = (value: number, packQty: number) => {
  if (packQty <= 0) return value;
  return Math.ceil(value / packQty) * packQty;
};

interface FormErrors {
  materialCode?: string;
  vendorCode?: string;
  packQuantity?: string;
  quantityPerBin?: string;
  maxBinQty?: string;
  totalBins?: string;
  minBinQty?: string;
  general?: string;
  vendorStock?: string;
}

export function AddMaterialModal({
  setIsOpen,
  onMaterialAdded,
}: AddMaterialModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const authRole = useAuthStore((state) => state.role);

  const [vendors, setVendors] = useState<string[]>([]);

  const [materialCode, setMaterialCode] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [location, setLocation] = useState("");
  const [vendorCode, setVendorCode] = useState("");
  
  const [productType, setProductType] = useState<
    "kanban" | "consumable" | "option" | "special"
  >("kanban");

  const [packQuantity, setPackQuantity] = useState("");
  const [quantityPerBin, setQuantityPerBin] = useState("");
  const [maxBinQty, setMaxBinQty] = useState("");
  const [totalBins, setTotalBins] = useState("");
  const [vendorStock, setVendorStock] = useState("0");

  const [errors, setErrors] = useState<FormErrors>({});
  const [showKelipatanError, setShowKelipatanError] = useState(false);

  const isReadOnly =
    authRole === "Admin" || authRole === "Vendor" || authRole === "Viewer";

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/companies`,
          {
            headers: {
              "Content-Type": "application/json",
              "X-User-Role": authRole || "",
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setVendors(data);
        }
      } catch (error) {
        console.error("Gagal mengambil data vendor:", error);
      }
    };

    fetchVendors();
  }, [authRole]);

  const {
    nPackQty,
    nMinBinQty,
    nMaxBinQty,
    nTotalBinsMemo,
    nQuantityPerBinMemo,
  } = useMemo(() => {
    const nPackQty = parseInt(packQuantity, 10) || 0;

    let nMaxBinQty = 0;
    let nMinBinQty = 0;
    let nTotalBinsMemo = 0;
    let nQuantityPerBinMemo = 0;

    if (productType === "kanban") {
      const initialMaxBinQty = parseInt(maxBinQty, 10) || 0;
      nMaxBinQty = roundUpToPack(initialMaxBinQty, nPackQty);
      nMinBinQty = nPackQty;
      nQuantityPerBinMemo = nPackQty;
      nTotalBinsMemo =
        nQuantityPerBinMemo > 0
          ? Math.ceil(nMaxBinQty / nQuantityPerBinMemo)
          : 0;
    } else if (productType === "consumable") {
      nTotalBinsMemo = parseInt(totalBins, 10) || 0;
      nQuantityPerBinMemo = parseInt(quantityPerBin, 10) || 0;
      nMaxBinQty = nTotalBinsMemo * nQuantityPerBinMemo;
      nMinBinQty = nPackQty;
    } else if (productType === "special") {
      
      nQuantityPerBinMemo = nPackQty; 
      const inputMax = parseInt(maxBinQty, 10) || 0;
      
      nMaxBinQty = inputMax > 0 ? inputMax : nPackQty; 
      nMinBinQty = nPackQty;
      nTotalBinsMemo = 0; 
    } else {
      
      nTotalBinsMemo = parseInt(totalBins, 10) || 0;
      nQuantityPerBinMemo = parseInt(quantityPerBin, 10) || 0;
      nMaxBinQty = nTotalBinsMemo * nQuantityPerBinMemo;
      nMinBinQty = nPackQty;
    }

    return {
      nPackQty,
      nMinBinQty,
      nMaxBinQty,
      nTotalBinsMemo,
      nQuantityPerBinMemo,
    };
  }, [packQuantity, quantityPerBin, maxBinQty, totalBins, productType]);

  const nVendorStock = useMemo(() => parseInt(vendorStock, 10) || 0, [
    vendorStock,
  ]);

  const replenishment = useMemo(() => {
    const soh = 0;
    const totalBins = nTotalBinsMemo;
    const qtyPerBin = nQuantityPerBinMemo;

    if (qtyPerBin <= 0) return 0;
    if (productType === "special") return 0; 

    const calc = Math.floor(totalBins - soh / qtyPerBin);
    return calc < 0 ? 0 : calc;
  }, [nTotalBinsMemo, nQuantityPerBinMemo, productType]);

  const previewMaterial = useMemo((): Material => {
    return {
      id: 0,
      material: materialCode,
      materialDescription,
      lokasi: location,
      vendorCode,
      productType: productType as Material["productType"],
      packQuantity: nPackQty,
      maxBinQty: nMaxBinQty,
      minBinQty: nMinBinQty,
      currentQuantity: 0,
      vendorStock: nVendorStock,
      bins:
        (productType !== "kanban" && productType !== "special")
          ? Array.from({ length: nTotalBinsMemo }, (_, i) => ({
              id: i,
              materialId: 0,
              binSequenceId: i + 1,
              maxBinStock: nQuantityPerBinMemo,
              currentBinStock: 0,
            }))
          : undefined, 
    };
  }, [
    materialCode,
    materialDescription,
    location,
    vendorCode,
    productType,
    nPackQty,
    nMaxBinQty,
    nMinBinQty,
    nTotalBinsMemo,
    nQuantityPerBinMemo,
    nVendorStock,
  ]);

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const autoFixKelipatan = () => {
    if (productType === "kanban" || nTotalBinsMemo <= 0 || nPackQty <= 0)
      return;
    const targetMax = roundUpToPack(nMaxBinQty, nPackQty);
    const newQtyPerBin = Math.ceil(targetMax / nTotalBinsMemo);
    const newMax = nTotalBinsMemo * newQtyPerBin;
    const finalTargetMax = roundUpToPack(newMax, nPackQty);
    const finalNewQtyPerBin = Math.ceil(finalTargetMax / nTotalBinsMemo);
    setQuantityPerBin(String(finalNewQtyPerBin));
    clearError("general");
    setShowKelipatanError(false);
  };

  const validate = (): boolean => {
    setShowKelipatanError(false);
    const newErrors: FormErrors = {};

    if (!materialCode.trim()) {
      newErrors.materialCode = "Kode Material wajib diisi.";
    }
    if (!vendorCode) {
      newErrors.vendorCode = "Vendor wajib dipilih.";
    }
    if (nPackQty <= 0) {
      newErrors.packQuantity = "Pack Qty harus > 0.";
    }

    if (nVendorStock < 0) {
      newErrors.vendorStock = "Vendor Stock tidak boleh negatif.";
    }

    if (productType === "kanban") {
      if (parseInt(maxBinQty, 10) <= 0) {
        newErrors.maxBinQty = "Max Bin Qty harus > 0.";
      }
    } else if (productType === "consumable") {
      if (nTotalBinsMemo <= 0) {
        newErrors.totalBins = "Total Bins harus > 0.";
      }
      if (nQuantityPerBinMemo <= 0) {
        newErrors.quantityPerBin = "Qty per Bin harus > 0.";
      }
    } else if (productType === "special") {
      
      if (nPackQty <= 0) {
        newErrors.packQuantity = "Pack Qty wajib > 0 untuk Special Consumable.";
      }
    } else {
      if (nTotalBinsMemo <= 0) {
        newErrors.totalBins = "Total Bins harus > 0.";
      }
      if (nQuantityPerBinMemo <= 0) {
        newErrors.quantityPerBin = "Qty per Bin harus > 0.";
      }
    }

    let generalError = "";

    if (productType !== "kanban" && productType !== "special") {
      if (
        nQuantityPerBinMemo > 0 &&
        nPackQty > 0 &&
        nQuantityPerBinMemo < nPackQty
      ) {
        newErrors.quantityPerBin = `Qty per Bin (${nQuantityPerBinMemo}) tidak boleh lebih kecil dari Pack Qty (${nPackQty}).`;
      }
    }

    
    if (productType !== "special" && nMaxBinQty > 0 && nPackQty > 0 && nMaxBinQty % nPackQty !== 0) {
      generalError += `Max Qty (Final: ${nMaxBinQty}) harus merupakan kelipatan dari Pack Qty (${nPackQty}). `;
      setShowKelipatanError(true);
    }

    if (nMaxBinQty > 0 && nMaxBinQty < nMinBinQty) {
      generalError += `Max Qty (${nMaxBinQty}) tidak boleh lebih kecil dari Min Qty (${nMinBinQty}).`;
    }

    if (generalError) {
      newErrors.general = generalError.trim();
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setErrors({});
    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        material: materialCode,
        materialDescription,
        lokasi: location,
        packQuantity: nPackQty,
        maxBinQty: nMaxBinQty,
        minBinQty: nMinBinQty,
        vendorCode,
        vendorStock: nVendorStock,
        productType: productType,
        bins: previewMaterial.bins,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/materials/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Role": authRole || "",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menambah material.");
      }

      const newMaterial = await response.json();
      onMaterialAdded(newMaterial);
      setIsOpen(false);
    } catch (error) {
      console.error("Error adding material:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Terjadi kesalahan.";
      if (errorMsg.includes("duplicate key")) {
        setErrors({ materialCode: "Kode Material ini sudah ada." });
      } else {
        setErrors({ general: errorMsg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Tambah Material Baru</DialogTitle>
        <DialogDescription>
          Isi detail material, konfigurasi bin, dan vendor di bawah ini.
        </DialogDescription>
      </DialogHeader>

      <div className="gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
        {}
        <div className="grid grid-cols-4 items-start gap-4 mb-4">
          <Label htmlFor="materialCode" className="text-left pt-2">
            Kode Material
          </Label>
          <div className="col-span-3">
            <Input
              id="materialCode"
              value={materialCode}
              onChange={(e) => {
                setMaterialCode(e.target.value);
                clearError("materialCode");
              }}
              className={errors.materialCode ? "border-destructive" : ""}
              disabled={isReadOnly}
            />
            {errors.materialCode && (
              <p className="text-xs text-destructive mt-1">
                {errors.materialCode}
              </p>
            )}
          </div>
        </div>
        
        {}
        <div className="grid grid-cols-4 items-center gap-4 mb-4">
          <Label htmlFor="description" className="text-left">
            Deskripsi
          </Label>
          <Input
            id="description"
            value={materialDescription}
            onChange={(e) => setMaterialDescription(e.target.value)}
            className="col-span-3"
            placeholder="(Opsional)"
            disabled={isReadOnly}
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4 mb-4">
          <Label htmlFor="location" className="text-left">
            Lokasi
          </Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="col-span-3"
            placeholder="(Opsional)"
            disabled={isReadOnly}
          />
        </div>

        {}
        <div className="grid grid-cols-4 items-center gap-4 mb-4">
          <Label htmlFor="productType" className="text-left">
            Tipe Produk
          </Label>
          <Select
            value={productType}
            onValueChange={(value: string) => {
              const newType = value as "kanban" | "consumable" | "option" | "special";
              setProductType(newType);
              if (newType === "option") {
                setQuantityPerBin("1");
              }
            }}
            disabled={isReadOnly}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Pilih Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kanban">Kanban (Agregat)</SelectItem>
              <SelectItem value="consumable">Consumable (Per Bin)</SelectItem>
              <SelectItem value="option">Option (Per Bin)</SelectItem>
              <SelectItem value="special">Special Consumable (No Bin)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {}
        <div className="col-span-4 border-t pt-4 mt-2 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="packQty">Pack Quantity</Label>
            <Input
              id="packQty"
              type="number"
              value={packQuantity}
              onChange={(e) => {
                setPackQuantity(e.target.value);
                clearError("packQuantity");
              }}
              placeholder="Qty per scan"
              className={errors.packQuantity ? "border-destructive" : ""}
              disabled={isReadOnly}
            />
            {errors.packQuantity && (
              <p className="text-xs text-destructive mt-1">
                {errors.packQuantity}
              </p>
            )}
          </div>
          
          {(productType === "kanban" || productType === "special") && (
            <div className="space-y-2">
              <Label htmlFor="maxBinQty">
                {productType === "special" ? "Max Capacity (Opsional)" : "Max Bin Qty (Total)"}
              </Label>
              <Input
                id="maxBinQty"
                type="number"
                value={maxBinQty}
                onChange={(e) => {
                  setMaxBinQty(e.target.value);
                  clearError("maxBinQty");
                }}
                placeholder={productType === "special" ? "Default: sama dg PackQty" : "Kapasitas total"}
                className={errors.maxBinQty ? "border-destructive" : ""}
                disabled={isReadOnly}
              />
              {errors.maxBinQty && (
                <p className="text-xs text-destructive mt-1">
                  {errors.maxBinQty}
                </p>
              )}
            </div>
          )}

          {(productType === "consumable" || productType === "option") && (
            <div className="space-y-2">
              <Label htmlFor="totalBins">Total Bins</Label>
              <Input
                id="totalBins"
                type="number"
                value={totalBins}
                onChange={(e) => {
                  setTotalBins(e.target.value);
                  clearError("totalBins");
                }}
                placeholder="Jumlah bin"
                className={errors.totalBins ? "border-destructive" : ""}
                disabled={isReadOnly}
              />
              {errors.totalBins && (
                <p className="text-xs text-destructive mt-1">
                  {errors.totalBins}
                </p>
              )}
            </div>
          )}
          {(productType === "consumable" || productType === "option") && (
            <div className="space-y-2">
              <Label htmlFor="quantityPerBin">Quantity per Bin</Label>
              <Input
                id="quantityPerBin"
                type="number"
                value={quantityPerBin}
                onChange={(e) => {
                  setQuantityPerBin(e.target.value);
                  clearError("quantityPerBin");
                }}
                placeholder="Kapasitas per bin"
                className={errors.quantityPerBin ? "border-destructive" : ""}
                disabled={isReadOnly}
              />
              {errors.quantityPerBin && (
                <p className="text-xs text-destructive mt-1">
                  {errors.quantityPerBin}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="col-span-4 rounded-md border p-4 my-2">
          <Label className="text-xs text-muted-foreground">
            Preview Konfigurasi Bin
          </Label>
          <p className="text-xs text-muted-foreground mb-3">
            Max Qty (Final):{" "}
            <span className="font-bold text-primary">{nMaxBinQty}</span> | Min
            Qty (Final):{" "}
            <span className="font-bold text-primary">{nMinBinQty}</span>
          </p>
          {productType !== "special" && (
            <p className="text-xs text-muted-foreground mb-3">
              Replenishment:{" "}
              <span className="font-bold text-primary">{replenishment}</span> bin
              (SOH: 0)
            </p>
          )}
          <p className="text-xs text-muted-foreground mb-3">
            {productType === "special" ? "No Bin System (Pack based)" : (
            <>Total <span className="font-bold text-primary">{nTotalBinsMemo}</span> bin</>
            )}
            {productType !== "special" && (
            <>, masing-masing <span className="font-bold text-primary">
              {nQuantityPerBinMemo}
            </span> pcs</>
            )}
          </p>
          <BinPreview material={previewMaterial} />
        </div>

        {errors.general && (
          <div className="col-span-4 my-2 text-sm text-destructive text-center p-2 bg-destructive/10 rounded-md">
            <p>{errors.general}</p>
            {showKelipatanError && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="mt-2"
                onClick={autoFixKelipatan}
                disabled={isReadOnly}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Otomatis Bulatkan Qty per Bin
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-4 items-start gap-4 border-t pt-4 mt-2">
          <Label htmlFor="vendorCode" className="text-left pt-2">
            Vendor
          </Label>
          <div className="col-span-3">
            <Select
              value={vendorCode}
              onValueChange={(value) => {
                setVendorCode(value);
                clearError("vendorCode");
              }}
              disabled={isReadOnly}
            >
              <SelectTrigger
                className={errors.vendorCode ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Pilih vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.length > 0 ? (
                  vendors.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="loading" disabled>
                    Memuat data vendor...
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.vendorCode && (
              <p className="text-xs text-destructive mt-1">
                {errors.vendorCode}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 items-start gap-4 mt-4">
          <Label htmlFor="vendorStock" className="text-left pt-2">
            Vendor Stock
          </Label>
          <div className="col-span-3">
            <Input
              id="vendorStock"
              type="number"
              value={vendorStock}
              onChange={(e) => {
                setVendorStock(e.target.value);
                clearError("vendorStock");
              }}
              placeholder="Stok awal vendor"
              className={errors.vendorStock ? "border-destructive" : ""}
              disabled={isReadOnly}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Stok yang dimiliki vendor (untuk replenishment).
            </p>
            {errors.vendorStock && (
              <p className="text-xs text-destructive mt-1">
                {errors.vendorStock}
              </p>
            )}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setIsOpen(false)}>
          Batal
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading || isReadOnly}>
          {isLoading ? "Menyimpan..." : "Simpan Material"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}