// Zustand Store for Global Application State
import { create } from 'zustand';
import type { Organization, User } from '../types/api.types';

interface AppState {
  // Current organization
  organization: Organization | null;
  setOrganization: (org: Organization | null) => void;

  // Current user
  user: User | null;
  setUser: (user: User | null) => void;

  // Selected products (for bulk operations)
  selectedProducts: string[];
  setSelectedProducts: (ids: string[]) => void;
  toggleProductSelection: (id: string) => void;
  clearSelection: () => void;

  // UI state
  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Organization state
  organization: null,
  setOrganization: (org) => set({ organization: org }),

  // User state
  user: null,
  setUser: (user) => set({ user }),

  // Selected products
  selectedProducts: [],
  setSelectedProducts: (ids) => set({ selectedProducts: ids }),
  toggleProductSelection: (id) =>
    set((state) => ({
      selectedProducts: state.selectedProducts.includes(id)
        ? state.selectedProducts.filter((pid) => pid !== id)
        : [...state.selectedProducts, id],
    })),
  clearSelection: () => set({ selectedProducts: [] }),

  // UI state
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  // Loading state
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
