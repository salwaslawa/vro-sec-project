"use client";

import { useState } from "react";
import { useAuthStore, Vendor } from "@/lib/types";
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

interface AddVendorModalProps {
  setIsOpen: (open: boolean) => void;
  onVendorAdded: (newVendor: Vendor) => void;
}

const PREDEFINED_TYPES = ["Panel", "Busbar"];
const OTHER_VALUE = "Lainnya";

export function AddVendorModal({
  setIsOpen,
  onVendorAdded,
}: AddVendorModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const role = useAuthStore((state) => state.role);
  const [companyName, setCompanyName] = useState("");
  
  const [selectedType, setSelectedType] = useState("");
  const [customType, setCustomType] = useState("");

  const handleSubmit = async () => {
    const finalVendorType =
      selectedType === OTHER_VALUE ? customType.trim() : selectedType;

    if (!companyName || !finalVendorType) {
      alert("Nama Perusahaan dan Tipe Vendor harus diisi.");
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        companyName,
        vendorType: finalVendorType, 
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vendors/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Role": role || "",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menambah vendor.");
      }

      const newVendor = await response.json();
      onVendorAdded(newVendor);
      setIsOpen(false);
    } catch (error) {
      console.error("Error adding vendor:", error);
      alert(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Tambah Vendor Baru</DialogTitle>
        <DialogDescription>
          Isi detail perusahaan/vendor di bawah ini.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="companyName" className="text-left">
            Nama Perusahaan
          </Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="col-span-3"
          />
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="vendorTypeSelect" className="text-left">
            Tipe Vendor
          </Label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Pilih tipe" />
            </SelectTrigger>
            <SelectContent>
              {PREDEFINED_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
              <SelectItem value={OTHER_VALUE}>Lainnya...</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedType === OTHER_VALUE && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customVendorType" className="text-left">
              Tipe Lainnya
            </Label>
            <Input
              id="customVendorType"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              className="col-span-3"
              placeholder="Masukkan tipe vendor kustom"
            />
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setIsOpen(false)}>
          Batal
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Menyimpan..." : "Simpan Vendor"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}