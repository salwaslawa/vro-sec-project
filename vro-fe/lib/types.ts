

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type NullString = {
  String: string;
  Valid: boolean;
};

interface UserState {
  username: string | null;
  role: string | null;
  companyName: string | null;
  vendorType: string | null;
  isLoggedIn: boolean;
  lastActivity: number; 

  login: (userData: {
    username: string;
    role: string;
    companyName: string | null;
    vendorType: string | null;
  }) => void;
  logout: () => void;
  updateActivity: () => void; 
}

export type User = {
  id: number;
  username: string;
  role: string;
  companyName: NullString | null;  
  vendorType: NullString | null;  
};

export interface Vendor {
  id: number;
  companyName: string;
  vendorType: string;
  createdAt: string;
  updatedAt: string;
}
export interface MaterialBin {
  id: number;
  materialId: number;
  binSequenceId: number;
  maxBinStock: number;
  currentBinStock: number;
}

export interface Material {
  id: number;
  material: string;
  materialDescription: string;
  lokasi: string; 
  packQuantity: number;
  maxBinQty: number;
  minBinQty: number;
  vendorCode: string;
  currentQuantity: number;
  pic?: string;
  vendorStock?: number;
  openPO?: number;
  productType: 'kanban' | 'consumable' | 'option' | 'block' | 'special'; 
  previousProductType?: string;
  bins?: MaterialBin[]; 
  remarkBlock?: any;
}

export interface MaterialStatusResponse {
  packQuantity: number;
  maxBinQty: number;
  minBinQty: number;
  currentQuantity: number;
  
  productType: "kanban" | "consumable" | "option" | "block" | "special";
  quantityPerBin: number; 
  bins: MaterialBin[] | null; 
  vendorStock: number;
  openPO: number;
}

export interface GoSqlNullInt {
  Int64: number;
  Valid: boolean;
}

export interface GoSqlNullString {
  String: string;
  Valid: boolean;
}

export interface StockMovement {
  id: number;
  materialId: number;
  materialCode: string;
  
  movementType: "Edit" | "Scan IN" | "Scan OUT" | "Edit Vendor Stock" | "Scan In (Special)" | "Scan Out (Special)" | "Edit (Special)";  
  quantityChange: number;
  oldQuantity: number;
  newQuantity: number;
  pic: string;
  notes: GoSqlNullString; 
  binSequenceId: GoSqlNullInt;
  timestamp: string;
}

export const useAuthStore = create<UserState>()(
  persist(
    (set) => ({
      username: null,
      role: null,
      companyName: null,
      vendorType: null,
      isLoggedIn: false,
      lastActivity: Date.now(), 

      login: (userData) => set({
        username: userData.username,
        role: userData.role,
        companyName: userData.companyName,
        vendorType: userData.vendorType,
        isLoggedIn: true,
        lastActivity: Date.now(), 
      }),

      logout: () => set({
        username: null,
        role: null,
        companyName: null,
        vendorType: null,
        isLoggedIn: false,
        lastActivity: 0,
      }),

      updateActivity: () => set({ lastActivity: Date.now() }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);