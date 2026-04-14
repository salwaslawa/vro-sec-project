"use client";

import { useState, useEffect } from "react";
import { useAuthStore, User } from "@/lib/types";
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddUserModalProps {
  setIsOpen: (open: boolean) => void;
  onUserAdded: (newUser: User) => void;
}

export function AddUserModal({ setIsOpen, onUserAdded }: AddUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const authRole = useAuthStore((state) => state.role);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userRole, setUserRole] = useState("Viewer");
  const [companyName, setCompanyName] = useState("");
  const [vendorType, setVendorType] = useState("");

  const [companies, setCompanies] = useState<string[]>([]);
  const [vendorTypes, setVendorTypes] = useState<string[]>([]);

  const isVendor = userRole === "Vendor";

  const isReadOnly =
    authRole === "Admin" || authRole === "Vendor" || authRole === "Viewer";

  useEffect(() => {
    const fetchOptions = async () => {
      if (!isVendor) {
        setCompanies([]);
        setVendorTypes([]);
        return;
      }

      try {
        const headers = {
          "Content-Type": "application/json",
          "X-User-Role": authRole || "",
        };

        const compRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/companies`,
          { headers }
        );
        if (compRes.ok) {
          const data: string[] = await compRes.json();
          setCompanies(data);
        } else {
          console.error("Gagal mengambil daftar perusahaan");
          setCompanies([]);
        }

        const typeRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/vendor-type`,
          { headers }
        );
        if (typeRes.ok) {
          const data: string[] = await typeRes.json();
          setVendorTypes(data);
        } else {
          console.error("Gagal mengambil daftar tipe vendor");
          setVendorTypes([]);
        }
      } catch (error) {
        console.error("Gagal mengambil opsi dropdown:", error);
        setCompanies([]);
        setVendorTypes([]);
      }
    };

    fetchOptions();
  }, [isVendor, authRole]);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const payload = {
        username,
        password,
        role: userRole,
        companyName: isVendor
          ? { String: companyName, Valid: true }
          : null,
        vendorType: isVendor
          ? { String: vendorType, Valid: true }
          : null,
      };

      if (isVendor && (!companyName || !vendorType)) {
        throw new Error("Nama Perusahaan dan Tipe Vendor harus diisi.");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Role": authRole || "",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menambah pengguna.");
      }

      const newUser = await response.json();
      onUserAdded(newUser);
      setIsOpen(false);
    } catch (error) {
      console.error("Error adding user:", error);
      alert(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Tambah Pengguna Baru</DialogTitle>
        <DialogDescription>
          Isi detail pengguna di bawah ini.
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh] pr-6">
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-left">
              Username
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="col-span-3"
              disabled={isReadOnly}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-left">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="col-span-3"
              disabled={isReadOnly}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-left">
              Role
            </Label>
            <Select
              value={userRole}
              onValueChange={setUserRole}
              disabled={isReadOnly}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Pilih Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Superuser">Superuser</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Vendor">Vendor</SelectItem>
                <SelectItem value="Viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isVendor && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="companyName" className="text-left">
                  Nama Perusahaan
                </Label>
                <Select
                  value={companyName}
                  onValueChange={setCompanyName}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Pilih Perusahaan" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.length === 0 ? (
                      <SelectItem value="loading" disabled>
                        Memuat...
                      </SelectItem>
                    ) : (
                      companies.map((company) => (
                        <SelectItem key={company} value={company}>
                          {company}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vendorType" className="text-left">
                  Tipe Vendor
                </Label>
                <Select
                  value={vendorType}
                  onValueChange={setVendorType}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Pilih Tipe Vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorTypes.length === 0 ? (
                      <SelectItem value="loading" disabled>
                        Memuat...
                      </SelectItem>
                    ) : (
                      vendorTypes.map((vtype) => (
                        <SelectItem key={vtype} value={vtype}>
                          {vtype}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      <DialogFooter>
        <Button variant="outline" onClick={() => setIsOpen(false)}>
          Batal
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading || isReadOnly}>
          {isLoading ? "Menyimpan..." : "Simpan Pengguna"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}