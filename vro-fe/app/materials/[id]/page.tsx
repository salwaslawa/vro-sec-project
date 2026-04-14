"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { StockMovement, useAuthStore } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

import { MaterialAuthSkeleton } from "@/components/materials/material-skeleton";
import { getStockMovementColumns } from "@/components/materials/stock-movements/columns";
import { 
  StockMovementDataTable, 
  MergedStockMovement 
} from "@/components/materials/stock-movements/data-table";
import { ColumnDef } from "@tanstack/react-table";

export default function MaterialDetailPage() {
  const [data, setData] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [materialCode, setMaterialCode] = useState<string | null>(null);
  const { role, companyName } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const params = useParams(); 
  const materialId = params.id as string;

  useEffect(() => {
    setIsClient(true);
    if (!role) {
      router.push("/");
    }
  }, [role, router]);

  async function getMovementData() {
    if (!role || !materialId) return;
    setIsLoading(true);
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/materials/${materialId}/movements`;
      const res = await fetch(apiUrl, {
        headers: {
          "X-User-Role": role,
          "X-User-Company": companyName || "",
        },
      });
      if (!res.ok) {
        throw new Error("Gagal mengambil data histori stok");
      }
      const movements: StockMovement[] = await res.json();
      setData(movements || []);
      if (movements && movements.length > 0) {
        setMaterialCode(movements[0].materialCode);
      } else {
        setMaterialCode("Material");
      }
    } catch (error) {
      console.error("Error fetching movement data:", error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (role && materialId) {
      getMovementData();
    }
  }, [role, companyName, materialId]); 

  
  
  const columns = getStockMovementColumns() as ColumnDef<MergedStockMovement, unknown>[];

  if (!isClient || !role) {
    return <MaterialAuthSkeleton />;
  }
  if (isLoading) {
    return <MaterialAuthSkeleton />;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
        <div>
          <Button variant="ghost" asChild className="mb-2 -ml-4">
            <Link href="/materials">
              {" "}
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Daftar Material
            </Link>
          </Button>
          <h1 className="text-3xl">Histori Stok</h1>
          <p className="text-muted-foreground font-light mt-1">
            {materialCode
              ? `Log pergerakan untuk: ${materialCode}`
              : `Memuat data material...`}
          </p>
        </div>
      </div>

      {}
      <StockMovementDataTable columns={columns} data={data} />
    </div>
  );
}