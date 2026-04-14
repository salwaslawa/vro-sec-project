"use client";

import { useState } from "react";
import { useAuthStore, Material } from "@/lib/types";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteMaterialAlertProps {
  material: Material;
  setIsOpen: (open: boolean) => void;
  onMaterialDeleted: (materialId: number) => void;
}

export function DeleteMaterialAlert({
  material,
  setIsOpen,
  onMaterialDeleted,
}: DeleteMaterialAlertProps) {
  const [isLoading, setIsLoading] = useState(false);
  const role = useAuthStore((state) => state.role);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/materials/${material.id}`,
        {
          method: "DELETE",
          headers: {
            "X-User-Role": role || "",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menghapus material.");
      }
      onMaterialDeleted(material.id);
      setIsOpen(false);
    } catch (error) {
      console.error("Error deleting material:", error);
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
          Tindakan ini akan menghapus material{" "}
          <strong className="font-medium text-foreground">
            {material.material} ({material.materialDescription})
          </strong>{" "}
          secara permanen.
          <br />
          <strong className="text-red-600 mt-2 block">
            Catatan: Material hanya dapat dihapus jika Stok (Current Quantity)
            adalah 0.
          </strong>
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
          {isLoading ? "Menghapus..." : "Ya, Hapus Material"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
