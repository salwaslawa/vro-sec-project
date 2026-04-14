"use client";

import { useState } from "react";
import { useAuthStore, User } from "@/lib/types";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteUserAlertProps {
  user: User;
  setIsOpen: (open: boolean) => void;
  onUserDeleted: (userId: number) => void;
}

export function DeleteUserAlert({ user, setIsOpen, onUserDeleted }: DeleteUserAlertProps) {
  const [isLoading, setIsLoading] = useState(false);
  const role = useAuthStore((state) => state.role);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${user.id}`, {
        method: "DELETE",
        headers: {
            "X-User-Role": role || '',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menghapus pengguna.");
      }
      onUserDeleted(user.id); 
      setIsOpen(false);
    } catch (error) {
      console.error("Error deleting user:", error);
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
          Tindakan ini tidak dapat dibatalkan. Ini akan menghapus pengguna{' '}
          <strong className="font-medium text-foreground">{user.username}</strong> secara permanen.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => setIsOpen(false)} disabled={isLoading}>Batal</AlertDialogCancel>
        <AlertDialogAction onClick={handleDelete} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
          {isLoading ? "Menghapus..." : "Ya, Hapus Pengguna"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}