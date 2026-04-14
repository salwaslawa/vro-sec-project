"use client";

import { User, useAuthStore } from "@/lib/types";
import { UserDataTable } from "@/components/profile/user-data-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getColumns } from "@/components/profile/columns";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AddUserModal } from "@/components/profile/add-user-modal";
import { PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";

export function AdminProfileView() {
  const [data, setData] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const role = useAuthStore((state) => state.role);

  useEffect(() => {
    async function getUserData() {
      if (!role) return;
      setIsLoading(true);
      try {
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/users/`;
        const res = await fetch(apiUrl, {
          headers: {
            "X-User-Role": role,
          },
        });
        if (!res.ok) {
          console.error("Failed to fetch user data:", res.statusText);
          throw new Error("Gagal mengambil data pengguna");
        }
        const users = await res.json();
        setData(users);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (role === "Admin" || role === "Superuser") {
      getUserData();
    }
  }, [role]);

  const handleUserUpdated = (updatedUser: User) => {
    setData((prevData) =>
      prevData.map((user) =>
        user.id === updatedUser.id ? updatedUser : user
      )
    );
  };

  const handleUserDeleted = (userId: number) => {
    setData((prevData) => prevData.filter((user) => user.id !== userId));
  };

  const handleUserAdded = (newUser: User) => {
    setData((prevData) => [newUser, ...prevData]);
  };

  const columns = getColumns(handleUserUpdated, handleUserDeleted);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="mb-4">
          <h1 className="text-3xl mb-4">Manajemen Pengguna</h1>
          <p className="text-muted-foreground mb-6 font-light">
            Mengatur semua akun pengguna dalam sistem.
          </p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full mb-2" />
            <Skeleton className="h-12 w-full mb-2" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    // PERUBAHAN DISINI: Gunakan 'flex flex-col h-full gap-4' bukan container
    <div className="flex flex-col h-full gap-4">
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        {/* Header Section: flex-none agar tidak ikut scroll */}
        <div className="md:flex md:justify-between md:items-center flex-none">
          <div className="mb-4 md:mb-0">
            <h1 className="text-3xl">Manajemen Pengguna</h1>
            <p className="text-muted-foreground font-light mt-1">
              Mengatur semua akun pengguna dalam sistem.
            </p>
          </div>
          {role === "Superuser" && (
            <Button
              className="flex w-full md:w-52"
              onClick={() => setIsAddModalOpen(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Pengguna
            </Button>
          )}
        </div>

        {/* Table Container: flex-1 dan overflow-hidden agar scroll ada di dalam tabel */}
        <div className="flex-1 overflow-hidden">
          <UserDataTable columns={columns} data={data} />
        </div>

        <AddUserModal
          setIsOpen={setIsAddModalOpen}
          onUserAdded={handleUserAdded}
        />
      </Dialog>
    </div>
  );
}