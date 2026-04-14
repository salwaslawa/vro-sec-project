"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, History, Ban, Undo2 } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Material, useAuthStore } from "@/lib/types";
import { DeleteMaterialAlert } from "../materials/delete-material-alert";
import { EditMaterialModal } from "../materials/edit-material-modal";

interface DataTableRowActionsProps {
  material: Material;
  onMaterialUpdated: (updatedMaterial: Material) => void;
  onMaterialDeleted: (materialId: number) => void;
}

export function MaterialDataTableRowActions({
  material,
  onMaterialUpdated,
  onMaterialDeleted,
}: DataTableRowActionsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [remarkBlock, setRemarkBlock] = useState("");
  const { role, companyName } = useAuthStore(); 
  const router = useRouter(); 

  if (role === "Viewer") {
    return null;
  }

  const isSuperuser = role === "Superuser";
  const isBlocked = material.productType === "block";

  const handleViewHistory = () => {
    router.push(`/materials/${material.id}`);
  };

  const executeBlockAction = async (action: "block" | "unblock", remark: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/${material.id}/${action}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json", 
          "X-User-Role": role || "",
          "X-User-Company": companyName || "",
        },
        body: action === "block" ? JSON.stringify({ remarkBlock: remark }) : undefined,
      });

      if (res.ok) {
        window.location.reload();
      } else {
        alert("Gagal mengubah status material");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleBlock = async () => {
    if (!isBlocked) {
      setIsBlockModalOpen(true);
      return;
    }
    await executeBlockAction("unblock", "");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Buka menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={handleViewHistory}>
            <History className="mr-2 h-4 w-4" />
            Lihat Histori Stok
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={handleToggleBlock}>
            {isBlocked ? (
                <>
                    <Undo2 className="mr-2 h-4 w-4 text-green-600" />
                    Unblock Material
                </>
            ) : (
                <>
                    <Ban className="mr-2 h-4 w-4 text-orange-600" />
                    Block Material
                </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => setIsEditModalOpen(true)} disabled={isBlocked}>
            Edit Material
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600"
            onSelect={() => setIsDeleteAlertOpen(true)}
            disabled={!isSuperuser}
          >
            Hapus Material
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <EditMaterialModal
          material={material}
          setIsOpen={setIsEditModalOpen}
          onMaterialUpdated={onMaterialUpdated}
        />
      </Dialog>
      
      <AlertDialog
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
      >
        <DeleteMaterialAlert
          material={material}
          setIsOpen={setIsDeleteAlertOpen}
          onMaterialDeleted={onMaterialDeleted}
        />
      </AlertDialog>

      {/* MODAL ALASAN BLOCK YANG SUDAH JALAN & RAPI */}
      <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-orange-600 text-xl font-bold">Alasan Blokir Material</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-gray-500">
              Harap masukkan alasan kenapa material <strong>{material.material}</strong> ini diblokir.
            </p>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Contoh: Kualitas vendor menurun / Barang reject..."
              value={remarkBlock}
              onChange={(e) => setRemarkBlock(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockModalOpen(false)}>
              Batal
            </Button>
            <Button 
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={!remarkBlock.trim()} 
              onClick={() => executeBlockAction("block", remarkBlock)}
            >
              Blokir Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}