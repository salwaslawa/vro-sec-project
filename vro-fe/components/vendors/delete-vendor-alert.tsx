"use client";

import { useState } from "react";
import { useAuthStore, Vendor } from "@/lib/types";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteVendorAlertProps {
  vendor: Vendor;
  setIsOpen: (open: boolean) => void;
  onVendorDeleted: (vendorId: number) => void;
}

export function DeleteVendorAlert({
  vendor,
  setIsOpen,
  onVendorDeleted,
}: DeleteVendorAlertProps) {
  const [isLoading, setIsLoading] = useState(false);
  const role = useAuthStore((state) => state.role);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vendors/${vendor.id}`,
        {
          method: "DELETE",
          headers: {
            "X-User-Role": role || "",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menghapus vendor.");
      }
      onVendorDeleted(vendor.id);
      setIsOpen(false);
    } catch (error) {
      console.error("Error deleting vendor:", error);
      alert(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
        <AlertDialogDescription>
          Tindakan ini tidak dapat dibatalkan. Ini akan menghapus perusahaan{" "}
          <strong className="font-medium text-foreground">
            {vendor.companyName}
          </strong>{" "}
          secara permanen.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => setIsOpen(false)} disabled={isLoading}>
          Batal
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={handleDelete}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700"
        >
          {isLoading ? "Menghapus..." : "Ya, Hapus Vendor"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}