"use client";

import { useState } from "react";
import { Vendor, useAuthStore } from "@/lib/types";
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

interface EditVendorModalProps {
  vendor: Vendor;
  setIsOpen: (open: boolean) => void;
  onVendorUpdated: (updatedVendor: Vendor) => void;
}

const PREDEFINED_TYPES = ["Panel", "Busbar"];
const OTHER_VALUE = "Lainnya";

export function EditVendorModal({
  vendor,
  setIsOpen,
  onVendorUpdated,
}: EditVendorModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const authRole = useAuthStore((state) => state.role);

  const [companyName, setCompanyName] = useState(vendor.companyName);

  const isPredefined = PREDEFINED_TYPES.includes(vendor.vendorType);

  const [selectedType, setSelectedType] = useState(() =>
    isPredefined ? vendor.vendorType : OTHER_VALUE
  );
  const [customType, setCustomType] = useState(() =>
    isPredefined ? "" : vendor.vendorType
  );

  const isReadOnly =
    authRole === "Admin" || authRole === "Vendor" || authRole === "Viewer";

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
        `${process.env.NEXT_PUBLIC_API_URL}/api/vendors/${vendor.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-User-Role": authRole || "",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal mengupdate vendor.");
      }

      const updatedVendor: Vendor = {
        ...vendor,
        companyName,
        vendorType: finalVendorType,
      };

      onVendorUpdated(updatedVendor);
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating vendor:", error);
      alert(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {isReadOnly ? "Lihat Vendor" : "Edit Vendor"}: {vendor.companyName}
        </DialogTitle>
        <DialogDescription>
          {isReadOnly
            ? "Lihat detail perusahaan/vendor di bawah ini."
            : "Ubah detail perusahaan/vendor di bawah ini."}
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
            disabled={isReadOnly}
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="vendorTypeSelect" className="text-left">
            Tipe Vendor
          </Label>
          <Select
            value={selectedType}
            onValueChange={setSelectedType}
            disabled={isReadOnly}
          >
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
              disabled={isReadOnly}
            />
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setIsOpen(false)}>
          {isReadOnly ? "Tutup" : "Batal"}
        </Button>
        {!isReadOnly && (
          <Button onClick={handleSubmit} disabled={isLoading || isReadOnly}>
            {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}