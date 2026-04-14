"use client";
import {  useAuthStore } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UserProfileView() {
  const { username, role, companyName, vendorType } = useAuthStore(
    (state) => state
  );

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl mb-6">Profil Saya</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Informasi Akun</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Username:</span>
            <span className="font-medium">{username || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role:</span>
            <span className="font-medium">{role || "-"}</span>
          </div>
          {role === "External/Vendor" && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Perusahaan:</span>
                <span className="font-medium">{companyName || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipe Vendor:</span>
                <span className="font-medium">{vendorType || "-"}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}