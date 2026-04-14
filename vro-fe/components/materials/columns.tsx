"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import { Material } from "@/lib/types";
import { DataTableColumnHeader } from "../reusable-datatable/column-header";
import { MaterialDataTableRowActions } from "./row-actions";
import { BinPreview } from "./bin-preview";
import { Checkbox } from "../ui/checkbox";

type MaterialUpdateHandler = (updatedMaterial: Material) => void;
type MaterialDeleteHandler = (materialId: number) => void;


const formatNumber = (value: unknown): string => {
  const num = Number(value);
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("id-ID").format(num);
};

const exactFilterFn = (
  row: Row<Material>,
  columnId: string,
  filterValue: string[]
) => {
  if (!filterValue || filterValue.length === 0) return true;

  const rowValue = row.getValue(columnId);
  let cellValue = "";

  if (rowValue === null || rowValue === undefined) {
    cellValue = "(Kosong)";
  } else {
    cellValue = String(rowValue);
  }

  return filterValue.includes(cellValue);
};

export const getMaterialColumns = (
  onMaterialUpdated: MaterialUpdateHandler,
  onMaterialDeleted: MaterialDeleteHandler
): ColumnDef<Material>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "no",
    header: "No.",
    cell: ({ row }) => <span>{row.index + 1}</span>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "productType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipe" />
    ),
    enableColumnFilter: true,
    filterFn: exactFilterFn,
  },
  {
    accessorKey: "material",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Kode Material" />
    ),
    enableColumnFilter: true,
    filterFn: exactFilterFn,
  },
  {
    accessorKey: "materialDescription",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Deskripsi" />
    ),
    cell: ({ row }) => (
      <span className="max-w-[300px] truncate block">
        {row.getValue("materialDescription")}
      </span>
    ),
    enableColumnFilter: true,
  },
  {
    accessorKey: "currentQuantity",
    id: "soh",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SoH" />
    ),
    cell: ({ row }) => {
      
      return <span>{formatNumber(row.getValue("soh"))}</span>;
    },
    enableSorting: true,
    enableColumnFilter: true,
    enableHiding: false,
    filterFn: exactFilterFn,
  },
  {
    accessorKey: "minBinQty",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Min Qty" />
    ),
    id: "minBinQty",
    cell: ({ row }) => {
      
      return <span>{formatNumber(row.getValue("minBinQty"))}</span>;
    },
    enableColumnFilter: true,
    enableHiding: true,
    filterFn: exactFilterFn,
  },
  {
    accessorKey: "packQuantity",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Pack Qty" />
    ),
    id: "packQuantity",
    cell: ({ row }) => {
      
      return <span>{formatNumber(row.getValue("packQuantity"))}</span>;
    },
    enableColumnFilter: true,
    enableHiding: true,
    filterFn: exactFilterFn,
  },
  {
    accessorKey: "maxBinQty",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Max Qty" />
    ),
    id: "maxBinQty",
    cell: ({ row }) => {
      
      return <span>{formatNumber(row.getValue("maxBinQty"))}</span>;
    },
    enableColumnFilter: true,
    enableHiding: true,
    filterFn: exactFilterFn,
  },
  {
    id: "totalBins",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total Bins" />
    ),
    accessorFn: (row) =>
      row.packQuantity > 0 ? Math.ceil(row.maxBinQty / row.packQuantity) : 0,
    cell: ({ row }) => {
       
       return <span>{formatNumber(row.getValue("totalBins"))}</span>;
    },
    enableColumnFilter: true,
    enableHiding: true,
    filterFn: exactFilterFn,
  },
  {
    id: "currentQuantity",
    accessorFn: (row) => row.currentQuantity,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stok Bin" />
    ),
    cell: ({ row }) => {
      return <BinPreview material={row.original as Material} />;
    },
    enableSorting: true,
    enableColumnFilter: true,
    enableHiding: false,
    filterFn: exactFilterFn,
  },
  {
    id: "replenishment",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Replenishment" />
    ),
    accessorFn: (row) => {
      const {
        productType,
        currentQuantity,
        maxBinQty,
        packQuantity,
        bins,
      } = row;

      if (productType === "kanban" || productType === "special") {
        if (packQuantity <= 0 || maxBinQty <= 0) return 0;

        const totalBins = Math.ceil(maxBinQty / packQuantity);
        const occupiedBins = Math.ceil(currentQuantity / packQuantity);

        return Math.max(0, totalBins - occupiedBins);
      }

      if (!bins) {
        return 0;
      }

      const emptyBins = bins.filter((bin) => bin.currentBinStock === 0).length;
      return emptyBins;
    },
    cell: ({ row }) => {
      const value = row.getValue("replenishment");
      const type = row.original.productType;

      if (typeof value !== "number" || value < 0) {
        return <span className="text-muted-foreground">-</span>;
      }

      const label = type === "special" ? "Pack" : "Bin";

      
      return <span className="font-medium">{formatNumber(value)} {label}</span>;
    },
    enableSorting: true,
    filterFn: exactFilterFn,
  },
{
    id: "remark",
    accessorFn: (row) => {
      // 1. PENJAGA PINTU: Cek apakah material ini statusnya block?
      if (row.productType === "block") {
        // Karena dari backend Go pakai sql.NullString, kadang formatnya { String: "...", Valid: true } 
        // Kita tangkap dengan aman:
        const blockReason = row.remarkBlock?.String || row.remarkBlock || "Diblokir (Tanpa Alasan)";
        // Kita kasih bendera rahasia "BLOCKED|" di depannya biar gampang diwarnain nanti
        return `BLOCKED|${blockReason}`; 
      }

      // 2. KALAU NORMAL (Nggak diblokir), LANJUT HITUNG STOK LAMA:
      const { currentQuantity = 0, maxBinQty, packQuantity } = row;

      if (packQuantity <= 0 || maxBinQty <= 0) {
        return "N/A";
      }

      const current = currentQuantity;
      const shortagePoint = Math.ceil(maxBinQty * 0.3);
      const preshortagePoint = Math.ceil(maxBinQty * 0.6);

      if (current <= shortagePoint) {
        return "shortage";
      } else if (current > shortagePoint && current <= preshortagePoint) {
        return "preshortage";
      } else {
        return "ok";
      }
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Remark" />
    ),
    cell: ({ row }) => {
      const remark = row.getValue("remark") as string;

      // 3. KASIH WARNA KHUSUS KALAU MATERIALNYA DIBLOKIR
      if (remark && remark.startsWith("BLOCKED|")) {
        // Buang bendera rahasia "BLOCKED|" biar sisa alasannya aja
        const textAlasan = remark.split("|")[1]; 
        return (
          // Aku kasih truncate biar kalau alasannya panjang, nggak ngerusak tabel (jadi titik-titik)
          // Teks lengkapnya bakal muncul kalau kursor diarahkan ke situ (title)
          <span 
            className="text-orange-600 font-bold max-w-[150px] inline-block truncate align-bottom" 
            title={textAlasan}
          >
            🚨 {textAlasan}
          </span>
        );
      }

      // 4. WARNA LAMA UNTUK STATUS STOK
      let colorClass = "";
      switch (remark) {
        case "shortage":
          colorClass = "text-red-600 font-medium";
          break;
        case "preshortage":
          colorClass = "text-yellow-600 font-medium";
          break;
        case "ok":
          colorClass = "text-green-600 font-medium";
          break;
        default:
          colorClass = "text-gray-500";
      }
      return <span className={colorClass}>{remark}</span>;
    },
    enableColumnFilter: true,
    enableSorting: true,
    filterFn: exactFilterFn,
  },
  {
    accessorKey: "vendorCode",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Vendor" />
    ),
    enableColumnFilter: true,
    filterFn: exactFilterFn,
  },
  {
    accessorKey: "lokasi",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Lokasi" />
    ),
    enableColumnFilter: true,
    filterFn: exactFilterFn,
  },
  {
    accessorKey: "vendorStock",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Vendor Stock" />
    ),
    cell: ({ row }) => {
      const stock = (row.getValue("vendorStock") as number | null) ?? 0;

      const { productType, maxBinQty, packQuantity, bins, currentQuantity } =
        row.original;

      let totalBins = 0;
      if (productType === "kanban" || productType === "special") {
        if (packQuantity > 0) totalBins = Math.ceil(maxBinQty / packQuantity);
      } else if (bins) {
        totalBins = bins.length;
      }

      let replenishment: number | null = null;
      if (productType === "kanban" || productType === "special") {
        if (packQuantity <= 0 || maxBinQty <= 0) {
          replenishment = null;
        } else {
          const occupiedBins = Math.ceil(currentQuantity / packQuantity);
          replenishment = totalBins - occupiedBins;
        }
      } else {
        if (!bins) {
          replenishment = 0;
        } else {
          replenishment = bins.filter((bin) => bin.currentBinStock === 0).length;
        }
      }

      let colorClass = "";
      if (replenishment !== null && totalBins > 0) {
        const halfTotal = totalBins * 0.5;
        if (replenishment <= 1) {
          colorClass = "text-red-600 font-medium";
        } else if (replenishment > halfTotal) {
          colorClass = "text-green-600 font-medium";
        } else {
          colorClass = "text-yellow-600 font-medium";
        }
      }

      
      return <span className={colorClass}>{formatNumber(stock)}</span>;
    },
    enableSorting: true,
    filterFn: exactFilterFn,
  },
  {
    accessorKey: "openPO",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Open PO" />
    ),
    cell: ({ row }) => {
      const openPO = (row.getValue("openPO") as number | null) ?? 0;
      
      return <span>{formatNumber(openPO)}</span>;
    },
    enableSorting: true,
    enableColumnFilter: true,
    filterFn: exactFilterFn,
  },
  {
    accessorKey: "pic",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PIC" />
    ),
    enableColumnFilter: true,
    enableHiding: true,
    filterFn: exactFilterFn,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <MaterialDataTableRowActions
        material={row.original}
        onMaterialUpdated={onMaterialUpdated}
        onMaterialDeleted={onMaterialDeleted}
      />
    ),
  },
];