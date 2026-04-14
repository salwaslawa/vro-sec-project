"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog } from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Vendor, useAuthStore } from "@/lib/types";
import { DeleteVendorAlert } from "./delete-vendor-alert";
import { EditVendorModal } from "./edit-vendor-modal";

interface DataTableRowActionsProps {
  vendor: Vendor;
  onVendorUpdated: (updatedVendor: Vendor) => void;
  onVendorDeleted: (vendorId: number) => void;
}

export function VendorDataTableRowActions({
  vendor,
  onVendorUpdated,
  onVendorDeleted,
}: DataTableRowActionsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const authRole = useAuthStore((state) => state.role);

  const isReadOnly =
    authRole === "Admin" || authRole === "Vendor" || authRole === "Viewer";

  if (authRole === "Viewer") {
    return null;
  }

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
          <DropdownMenuItem onSelect={() => setIsEditModalOpen(true)}>
            {isReadOnly ? "Lihat Vendor" : "Edit Vendor"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600"
            onSelect={() => setIsDeleteAlertOpen(true)}
            disabled={isReadOnly}
          >
            Hapus Vendor
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <EditVendorModal
          vendor={vendor}
          setIsOpen={setIsEditModalOpen}
          onVendorUpdated={onVendorUpdated}
        />
      </Dialog>
      <AlertDialog
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
      >
        <DeleteVendorAlert
          vendor={vendor}
          setIsOpen={setIsDeleteAlertOpen}
          onVendorDeleted={onVendorDeleted}
        />
      </AlertDialog>
    </>
  );
}