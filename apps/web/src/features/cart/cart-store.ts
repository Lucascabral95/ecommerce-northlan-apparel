'use client';

import { create } from 'zustand';

type CartUiState = {
  closeDrawer: () => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
};

export const useCartUiStore = create<CartUiState>((set) => ({
  closeDrawer: () => set({ isDrawerOpen: false }),
  isDrawerOpen: false,
  openDrawer: () => set({ isDrawerOpen: true }),
}));
