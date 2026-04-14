"use client";

import { useState, useEffect } from "react";
import { User, useAuthStore } from "@/lib/types";
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

interface EditUserModalProps {
  user: User;
  setIsOpen: (open: boolean) => void;
  onUserUpdated: (updatedUser: User) => void;
}
type UserUpdatePayload = {
  username: string;
  role: string;
  companyName: { String: string; Valid: boolean } | null;
  vendorType: { String: string; Valid: boolean } | null;
  password?: string;
};

export function EditUserModal({
  user,
  setIsOpen,
  onUserUpdated,
}: EditUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const authRole = useAuthStore((state) => state.role);

  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState("");
  const [userRole, setUserRole] = useState(user.role);
  const [companyName, setCompanyName] = useState(user.companyName?.String || "");
  const [vendorType, setVendorType] = useState(user.vendorType?.String || "");

  const [companies, setCompanies] = useState<string[]>([]);
  const [vendorTypes, setVendorTypes] = useState<string[]>([]);

  const isVendor = userRole === "Vendor";

  const isReadOnly =
    authRole === "Admin" || authRole === "Vendor" || authRole === "Viewer";

  useEffect(() => {
    const fetchOptions = async () => {
      const currentCompany = user.companyName?.String || "";
      const currentType = user.vendorType?.String || "";

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

          if (currentCompany && !data.includes(currentCompany)) {
            data.unshift(currentCompany);
          }

          setCompanies(data);
        } else {
          console.error("Gagal mengambil daftar perusahaan");
          if (currentCompany) setCompanies([currentCompany]);
        }

        const typeRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/vendor-type`,
          { headers }
        );
        if (typeRes.ok) {
          const data: string[] = await typeRes.json();

          if (currentType && !data.includes(currentType)) {
            data.unshift(currentType);
          }

          setVendorTypes(data);
        } else {
          console.error("Gagal mengambil daftar tipe vendor");
          if (currentType) setVendorTypes([currentType]);
        }
      } catch (error) {
        console.error("Gagal mengambil opsi dropdown:", error);
        if (currentCompany) setCompanies([currentCompany]);
        if (currentType) setVendorTypes([currentType]);
      }
    };

    fetchOptions();
  }, [isVendor, authRole, user.companyName, user.vendorType]);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const payload: UserUpdatePayload = {
        username,
        role: userRole,
        companyName: isVendor
          ? { String: companyName, Valid: true }
          : null,
        vendorType: isVendor
          ? { String: vendorType, Valid: true }
          : null,
      };

      if (isVendor && (!companyName || !vendorType)) {
        throw new Error(
          "Nama Perusahaan dan Tipe Vendor harus diisi untuk role Vendor."
        );
      }

      if (password.trim() !== "") {
        payload.password = password;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${user.id}`,
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
        throw new Error(errorData.error || "Gagal mengupdate pengguna.");
      }

      const updatedUser: User = {
        ...user,
        username,
        role: userRole,
        companyName: {
          String: isVendor ? companyName : "",
          Valid: isVendor && companyName !== "",
        },
        vendorType: {
          String: isVendor ? vendorType : "",
          Valid: isVendor && vendorType !== "",
        },
      };

      onUserUpdated(updatedUser);
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating user:", error);
      alert(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {isReadOnly ? "Lihat Pengguna" : "Edit Pengguna"}: {user.username}
        </DialogTitle>
        <DialogDescription>
          {isReadOnly
            ? "Lihat detail pengguna di bawah ini."
            : "Ubah detail pengguna di bawah ini."}
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
              placeholder="Kosongkan jika tidak ganti"
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