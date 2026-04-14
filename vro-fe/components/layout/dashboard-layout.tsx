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
  const [filterMaterial, setFilterMaterial] = useState("all");
  const [filterVendor, setFilterVendor] = useState("all");
  const [filterRemark, setFilterRemark] = useState("all");

  const router = useRouter();
  const { role, companyName } = useAuthStore();

  useEffect(() => {
    setIsClient(true);
    if (!role) router.push("/");
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

        if (!res.ok) throw new Error("Gagal mengambil data material");

        const responseData = await res.json();
        
        // Jaga-jaga kalau lu butuh liat data asli di F12
        console.log("CEK DATA BACKEND:", responseData);

        if (Array.isArray(responseData)) {
          setMaterials(responseData);
        } else if (responseData && Array.isArray(responseData.data)) {
          setMaterials(responseData.data);
        } else {
          setMaterials([]);
        }

        const now = new Date();
        setLastUpdated(now.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" }));
      } catch (error) {
        console.error("Error fetching data:", error);
        setMaterials([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [role, companyName]);

  // 1. EXTRACT DROPDOWN OTOMATIS (Banyak Fallback Key biar Aman)
  const { uniqueVendors, uniqueMaterials, uniqueRemarks } = useMemo(() => {
    const vSet = new Set<string>();
    const mSet = new Set<string>();
    const rSet = new Set<string>();

    materials.forEach(m => {
      vSet.add(m["Vendor"] || m.vendor || m.vendorName || m.supplier || m.nama_supplier || "-");
      mSet.add(m["Kode Mate"] || m.kodeMate || m.kodeMaterial || m.kode_mate || m.kode || "-");
      rSet.add((m["Remark Status"] || m["Remark Sta"] || m.remarkStatus || m.remark || m.status || "-").toLowerCase());
    });

    return {
      uniqueVendors: Array.from(vSet).filter(v => v !== "-").sort(),
      uniqueMaterials: Array.from(mSet).filter(m => m !== "-").sort(),
      uniqueRemarks: Array.from(rSet).filter(r => r !== "-").sort(),
    };
  }, [materials]);

  // 2. FILTER DATA SEBELUM DIHITUNG
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const v = m["Vendor"] || m.vendor || m.vendorName || m.supplier || m.nama_supplier || "-";
      const mat = m["Kode Mate"] || m.kodeMate || m.kodeMaterial || m.kode_mate || m.kode || "-";
      const r = (m["Remark Status"] || m["Remark Sta"] || m.remarkStatus || m.remark || m.status || "-").toLowerCase();

      const matchVendor = filterVendor === "all" || v === filterVendor;
      const matchMaterial = filterMaterial === "all" || mat === filterMaterial;
      const matchRemark = filterRemark === "all" || r === filterRemark;

      return matchVendor && matchMaterial && matchRemark;
    });
  }, [materials, filterVendor, filterMaterial, filterRemark]);

  // 3. LOGIC PERHITUNGAN (FIX BACA 'ALASAN BLOCK')
  const { 
    totalMaterials, totalShortage, totalBlocked, totalVendorStock, totalOpenPO, 
    typeData, remarkPieData, vendorChartData 
  } = useMemo(() => {
    let shortage = 0; let ok = 0; let blocked = 0;
    let sumVendorStock = 0; let sumOpenPO = 0;
    
    const typeMap: Record<string, number> = {};
    const vendorMap: Record<string, number> = {};

    filteredMaterials.forEach((m: any) => {
      sumOpenPO += Number(m["Open PO"] || m.openPo || m.openPO || m.open_po || 0);
      
      const vStock = Number(m["Vendor Stock"] || m["Vendor Sto"] || m.vendorStock || m.vendor_stock || 0);
      sumVendorStock += vStock;

      const vName = m["Vendor"] || m.vendor || m.vendorName || m.supplier || "Tanpa Vendor";
      vendorMap[vName] = (vendorMap[vName] || 0) + vStock;

      // DETEKSI SHORTAGE YANG BENAR (Gabungin Remark Status & Alasan Block)
      const remarkStatus = (m["Remark Status"] || m["Remark Sta"] || m.remarkStatus || m.remark || "").toLowerCase();
      const alasanBlock = (m["Alasan Block"] || m["Alasan Blo"] || m.alasanBlock || m.alasan_block || "").toLowerCase();
      
      if (remarkStatus === "shortage" || alasanBlock.includes("rusak") || alasanBlock.includes("reject")) {
        shortage++;
      } else if (remarkStatus === "ok") {
        ok++; 
      }

      // Deteksi Blocked
      const tipeMaterial = (m["Tipe"] || m.tipe || m.type || "").toLowerCase();
      if (remarkStatus === "blocked" || tipeMaterial === "block") {
        blocked++;
      }

      const typeLabel = tipeMaterial ? tipeMaterial.toUpperCase() : "UNKNOWN";
      typeMap[typeLabel] = (typeMap[typeLabel] || 0) + 1;
    });

    const pieData = [
      { name: 'Kritis (Shortage)', value: shortage, color: '#ef4444' },
      { name: 'Aman / OK', value: ok, color: '#10b981' }
    ].filter(d => d.value > 0);

    const vendorChart = Object.keys(vendorMap).map(k => ({
      name: k,
      VendorStock: vendorMap[k]
    })).sort((a, b) => b.VendorStock - a.VendorStock);

    return {
      totalMaterials: filteredMaterials.length,
      totalShortage: shortage,
      totalBlocked: blocked,
      totalVendorStock: sumVendorStock,
      totalOpenPO: sumOpenPO,
      typeData: Object.keys(typeMap).map(k => ({ name: k, Jumlah: typeMap[k] })),
      remarkPieData: pieData,
      vendorChartData: vendorChart,
    };
  }, [filteredMaterials]);

  if (!isClient || !role) return <div className="p-8 text-center text-gray-500">Mengecek akses...</div>;
  if (isLoading) return <div className="p-8 text-center text-gray-500 font-medium animate-pulse">Memuat Dashboard...</div>;

  return (
    <div className="p-6 bg-gray-50 h-[calc(100vh-2rem)] overflow-y-auto pb-24">
      <div className="mb-6 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard Summary</h1>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1 flex items-center font-light">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Terakhir diperbarui: {lastUpdated}
            </p>
          )}
        </div>

        {/* DROPDOWN FILTER NARIK DARI TABEL ASLI */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border shadow-sm">
          <div className="flex flex-col">
            <label className="text-[10px] font-semibold text-gray-500 uppercase ml-1 mb-1">Kode Material</label>
            <select 
              className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#008A15] cursor-pointer"
              value={filterMaterial} onChange={(e) => setFilterMaterial(e.target.value)}
            >
              <option value="all">Semua Material</option>
              {uniqueMaterials.map((m, i) => <option key={i} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-semibold text-gray-500 uppercase ml-1 mb-1">Vendor</label>
            <select 
              className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#008A15] cursor-pointer max-w-[200px] truncate"
              value={filterVendor} onChange={(e) => setFilterVendor(e.target.value)}
            >
              <option value="all">Semua Vendor</option>
              {uniqueVendors.map((v, i) => <option key={i} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-semibold text-gray-500 uppercase ml-1 mb-1">Status</label>
            <select 
              className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#008A15] cursor-pointer capitalize"
              value={filterRemark} onChange={(e) => setFilterRemark(e.target.value)}
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
          <h3 className="text-xs text-gray-500 font-semibold uppercase">Total Material</h3>
          <p className="text-2xl font-semibold text-gray-800 mt-1">{totalMaterials}</p>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm text-center">
          <h3 className="text-xs text-red-600 font-semibold uppercase">Kritis (Shortage)</h3>
          <p className="text-2xl font-semibold text-red-700 mt-1">{totalShortage}</p>
        </div>
        <div className="p-4 bg-gray-100 border rounded-xl shadow-sm text-center">
          <h3 className="text-xs text-gray-600 font-semibold uppercase">Di Blokir</h3>
          <p className="text-2xl font-semibold text-gray-800 mt-1">{totalBlocked}</p>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl shadow-sm text-center">
          <h3 className="text-xs text-purple-600 font-semibold uppercase">Vendor Stock</h3>
          <p className="text-2xl font-semibold text-purple-700 mt-1">{totalVendorStock}</p>
        </div>
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm text-center">
          <h3 className="text-xs text-emerald-600 font-semibold uppercase">Total Open PO</h3>
          <p className="text-2xl font-semibold text-emerald-700 mt-1">{totalOpenPO}</p>
        </div>
      </div>

      {/* CHARTS ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 p-6 bg-white border rounded-xl shadow-sm h-[320px]">
          <h3 className="text-sm text-gray-700 font-semibold mb-4">Material Berdasarkan Tipe</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeData} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 400 }} />
              <YAxis tick={{ fontSize: 12, fontWeight: 400 }} allowDecimals={false} />
              <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="Jumlah" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-6 bg-white border rounded-xl shadow-sm h-[320px] flex flex-col items-center">
          <h3 className="text-sm text-gray-700 font-semibold w-full text-left mb-2">Status Remark</h3>
          {remarkPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={remarkPieData} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {remarkPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 400 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm font-light">Tidak ada data status</div>
          )}
        </div>
      </div>

      {/* CHARTS ROW 2 (VENDOR STOCK) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-white border rounded-xl shadow-sm h-[350px]">
          <h3 className="text-sm text-purple-700 font-semibold mb-4">Total Stok per Vendor</h3>
          {vendorChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {/* Pakai layout vertical biar nama vendor yg panjang bisa kebaca jelas */}
              <BarChart data={vendorChartData} layout="vertical" margin={{ top: 0, right: 20, left: 50, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fontWeight: 400 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 400 }} width={120} />
                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
                <Bar dataKey="VendorStock" fill="#a855f7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm font-light">Tidak ada data vendor</div>
          )}
        </div>
      </div>
      
    </div>
  );
}