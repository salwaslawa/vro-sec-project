"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/types"; 
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

export default function DashboardRplPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // STATE UNTUK FILTER
  const [filterVendor, setFilterVendor] = useState("all");
  const [filterTipe, setFilterTipe] = useState("all");
  const [filterRemark, setFilterRemark] = useState("all");

  const router = useRouter();
  const { role, companyName } = useAuthStore();

  useEffect(() => {
    setIsClient(true);
    if (!role) {
      router.push("/");
    }
  }, [role, router]);

  useEffect(() => {
    if (!role) return; 

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/materials/`;
        
        const res = await fetch(apiUrl, {
          headers: {
            "X-User-Role": role,
            "X-User-Company": companyName || "",
          },
        });

        if (!res.ok) {
          throw new Error("Gagal mengambil data material untuk dashboard");
        }

        const responseData = await res.json();
        
        if (Array.isArray(responseData)) {
          setMaterials(responseData);
        } else if (responseData && Array.isArray(responseData.data)) {
          setMaterials(responseData.data);
        } else {
          setMaterials([]);
        }

        const now = new Date();
        setLastUpdated(now.toLocaleString("id-ID", { 
          dateStyle: "full", 
          timeStyle: "short" 
        }));

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setMaterials([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [role, companyName]);

  // 1. DAPETIN OPSI FILTER DINAMIS DARI DATA
  const uniqueVendors = useMemo(() => {
    const vendors = materials.map(m => m.vendorName || m.supplier || m.vendor || "Tanpa Vendor");
    return Array.from(new Set(vendors)).sort();
  }, [materials]);

  const uniqueTipes = useMemo(() => {
    const tipes = materials.map(m => (m.tipe || m.type || m.productType || "Unknown").toLowerCase());
    return Array.from(new Set(tipes)).sort();
  }, [materials]);

  const uniqueRemarks = useMemo(() => {
    const remarks = materials.map(m => (m.remarkStatus || m.remark || "ok").toLowerCase());
    return Array.from(new Set(remarks)).sort();
  }, [materials]);

  // 2. LOGIC FILTERING DATA
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const v = m.vendorName || m.supplier || m.vendor || "Tanpa Vendor";
      const t = (m.tipe || m.type || m.productType || "Unknown").toLowerCase();
      const r = (m.remarkStatus || m.remark || "ok").toLowerCase();

      const matchVendor = filterVendor === "all" || v === filterVendor;
      const matchTipe = filterTipe === "all" || t === filterTipe;
      const matchRemark = filterRemark === "all" || r === filterRemark;

      return matchVendor && matchTipe && matchRemark;
    });
  }, [materials, filterVendor, filterTipe, filterRemark]);

  // 3. LOGIC PERHITUNGAN BERDASARKAN DATA YANG UDAH DIFILTER
  const { 
    totalMaterials, totalShortage, totalBlocked, 
    totalVendorStock, totalOpenPO, typeData, remarkPieData 
  } = useMemo(() => {
    let shortage = 0; let ok = 0; let blocked = 0;
    let sumVendorStock = 0; let sumOpenPO = 0;
    
    const typeMap: Record<string, number> = {};

    filteredMaterials.forEach((m: any) => {
      // Ambil Open PO
      sumOpenPO += Number(m.OpenPO || m.openPo || m.openPO || 0);

      // Ambil Vendor Stock
      sumVendorStock += Number(m.vendorStock || m.stokVendor || m.supplierStock || m.StokVendor || 0);

      // Status Remark
      const remark = (m.remarkStatus || m.remark || "").toLowerCase();
      if (remark === "shortage" || remark === "rusak" || remark.includes("reject")) {
        shortage++;
      } else {
        ok++; 
      }

      // Hitung Material Diblokir
      const tipeMaterial = (m.tipe || m.type || m.productType || "").toLowerCase();
      if (tipeMaterial === "block") blocked++;

      // Data Bar Chart Tipe Material
      const typeLabel = tipeMaterial ? tipeMaterial.toUpperCase() : "UNKNOWN";
      typeMap[typeLabel] = (typeMap[typeLabel] || 0) + 1;
    });

    const pieData = [
      { name: 'Kritis (Shortage)', value: shortage, color: '#ef4444' },
      { name: 'Aman / OK', value: ok, color: '#10b981' }
    ].filter(d => d.value > 0);

    return {
      totalMaterials: filteredMaterials.length,
      totalShortage: shortage,
      totalBlocked: blocked,
      totalVendorStock: sumVendorStock,
      totalOpenPO: sumOpenPO,
      typeData: Object.keys(typeMap).map((k) => ({ name: k, Jumlah: typeMap[k] })),
      remarkPieData: pieData,
    };
  }, [filteredMaterials]); // <--- Skrg ngitung dari filteredMaterials

  if (!isClient || !role) {
    return <div className="p-8 text-center text-gray-500">Mengecek akses...</div>;
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 font-medium animate-pulse">Memuat Dashboard...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 h-[calc(100vh-2rem)] overflow-y-auto pb-24">
      {/* HEADER & LAST UPDATED */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Summary</h1>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Terakhir diperbarui: {lastUpdated}
            </p>
          )}
        </div>

        {/* SECTION FILTER DROPDOWN */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border shadow-sm">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 mb-1">Vendor</label>
            <select 
              className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
            >
              <option value="all">Semua Vendor</option>
              {uniqueVendors.map((v, i) => <option key={i} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 mb-1">Tipe Material</label>
            <select 
              className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer capitalize"
              value={filterTipe}
              onChange={(e) => setFilterTipe(e.target.value)}
            >
              <option value="all">Semua Tipe</option>
              {uniqueTipes.map((t, i) => <option key={i} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 mb-1">Status Remark</label>
            <select 
              className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer capitalize"
              value={filterRemark}
              onChange={(e) => setFilterRemark(e.target.value)}
            >
              <option value="all">Semua Status</option>
              {uniqueRemarks.map((r, i) => <option key={i} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="p-4 bg-white border rounded-xl shadow-sm text-center">
          <h3 className="text-xs text-gray-500 font-medium uppercase">Total Material</h3>
          <p className="text-2xl font-bold text-gray-800 mt-1">{totalMaterials}</p>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm text-center">
          <h3 className="text-xs text-red-600 font-medium uppercase">Kritis (Shortage)</h3>
          <p className="text-2xl font-bold text-red-700 mt-1">{totalShortage}</p>
        </div>
        <div className="p-4 bg-gray-100 border rounded-xl shadow-sm text-center">
          <h3 className="text-xs text-gray-600 font-medium uppercase">Di Blokir</h3>
          <p className="text-2xl font-bold text-gray-800 mt-1">{totalBlocked}</p>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl shadow-sm text-center">
          <h3 className="text-xs text-purple-600 font-medium uppercase">Vendor Stock</h3>
          <p className="text-2xl font-bold text-purple-700 mt-1">{totalVendorStock}</p>
        </div>
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm text-center">
          <h3 className="text-xs text-emerald-600 font-medium uppercase">Total Open PO</h3>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{totalOpenPO}</p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-white border rounded-xl shadow-sm h-[350px]">
          <h3 className="text-sm text-gray-700 font-bold mb-4">Material Berdasarkan Tipe</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeData} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="Jumlah" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-6 bg-white border rounded-xl shadow-sm h-[350px] flex flex-col items-center">
          <h3 className="text-sm text-gray-700 font-bold w-full text-left mb-2">Status Remark</h3>
          {remarkPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={remarkPieData} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {remarkPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">Tidak ada data</div>
          )}
        </div>
      </div>
    </div>
  );
}