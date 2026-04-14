"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Vendor, useAuthStore } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";

import { getVendorColumns } from "@/components/vendors/columns";
import { AddVendorModal } from "@/components/vendors/add-vendor.modal";
import { VendorDataTable } from "@/components/vendors/vendor-data-table";
import { VendorAuthSkeleton } from "./vendor-skeleton";

export function VendorPage() {
  const [data, setData] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const role = useAuthStore((state) => state.role);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  const canViewPage = role === "Admin" || role === "Superuser";
  const canAdd = role === "Superuser";

  useEffect(() => {
    setIsClient(true);
    if (role && !canViewPage) {
      router.push("/");
    }
  }, [role, router, canViewPage]);

  useEffect(() => {
    async function getVendorData() {
      if (!role) return;
      setIsLoading(true);
      try {
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/vendors/`;
        const res = await fetch(apiUrl, {
          headers: {
            "X-User-Role": role,
          },
        });
        if (!res.ok) {
          throw new Error("Gagal mengambil data vendor");
        }
        const vendors = await res.json();
        setData(vendors || []);
      } catch (error) {
        console.error("Error fetching vendor data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (canViewPage) {
      getVendorData();
    }
  }, [role, canViewPage]);

  const handleVendorUpdated = (updatedVendor: Vendor) => {
    setData((prevData) =>
      prevData.map((vendor) =>
        vendor.id === updatedVendor.id ? updatedVendor : vendor
      )
    );
  };

  const handleVendorDeleted = (vendorId: number) => {
    setData((prevData) => prevData.filter((vendor) => vendor.id !== vendorId));
  };

  const handleVendorAdded = (newVendor: Vendor) => {
    setData((prevData) => [newVendor, ...prevData]);
  };

  const columns = getVendorColumns(handleVendorUpdated, handleVendorDeleted);

  if (!isClient || !role) {
    return <VendorAuthSkeleton />;
  }

  if (!canViewPage) {
    return (
      <div className="flex flex-col h-full justify-center items-center">
        <h1 className="text-3xl text-red-600">Akses Ditolak</h1>
        <p className="text-muted-foreground mt-2">
          Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <VendorAuthSkeleton />;
  }

  return (
    // PERUBAHAN DISINI: Gunakan 'flex flex-col h-full gap-4'
    <div className="flex flex-col h-full gap-4">
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        {/* Header Section: Flex-none */}
        <div className="md:flex md:justify-between md:items-center flex-none">
          <div className="mb-4 md:mb-0">
            <h1 className="text-3xl">Manajemen Perusahaan (Vendor)</h1>
            <p className="text-muted-foreground font-light mt-1">
              Mengatur daftar master perusahaan dan tipe vendor.
            </p>
          </div>
          {canAdd && (
            <Button
              className="flex w-full md:w-52"
              onClick={() => setIsAddModalOpen(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Vendor
            </Button>
          )}
        </div>

        {/* Table Wrapper: Flex-1 Overflow-hidden */}
        <div className="flex-1 overflow-hidden">
          <VendorDataTable columns={columns} data={data} />
        </div>

        <AddVendorModal
          setIsOpen={setIsAddModalOpen}
          onVendorAdded={handleVendorAdded}
        />
      </Dialog>
    </div>
  );
}