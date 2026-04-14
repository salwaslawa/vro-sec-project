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
import { User, useAuthStore } from "@/lib/types";
import { DeleteUserAlert } from "./delete-user-alert";
import { EditUserModal } from "./edit-user-modal";

interface DataTableRowActionsProps {
  user: User;
  onUserUpdated: (updatedUser: User) => void;
  onUserDeleted: (userId: number) => void;
}

export function DataTableRowActions({
  user,
  onUserUpdated,
  onUserDeleted,
}: DataTableRowActionsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const currentUser = useAuthStore((state) => state.username);
  const { role: authRole } = useAuthStore();

  const isSelf = currentUser === user.username;

  if (authRole === "Viewer") {
    return null;
  }

  const isReadOnly = authRole === "Admin" || authRole === "Vendor";

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
            {isReadOnly ? "Lihat Pengguna" : "Edit Pengguna"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600"
            onSelect={() => setIsDeleteAlertOpen(true)}
            disabled={isSelf || isReadOnly}
          >
            Hapus Pengguna
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <EditUserModal
          user={user}
          setIsOpen={setIsEditModalOpen}
          onUserUpdated={onUserUpdated}
        />
      </Dialog>
      <AlertDialog
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
      >
        <DeleteUserAlert
          user={user}
          setIsOpen={setIsDeleteAlertOpen}
          onUserDeleted={onUserDeleted}
        />
      </AlertDialog>
    </>
  );
}