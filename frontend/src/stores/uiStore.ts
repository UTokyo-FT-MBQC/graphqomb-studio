/**
 * UI Store
 *
 * State store for UI-related settings like view mode, z-slice, and flow toggles.
 */

import { create } from "zustand";

export type ViewMode = "2d-slice" | "3d-isometric";

interface UIState {
  viewMode: ViewMode;
  currentZSlice: number;
  showXFlow: boolean;
  showZFlow: boolean;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setZSlice: (z: number) => void;
  incrementZSlice: () => void;
  decrementZSlice: () => void;
  toggleXFlow: () => void;
  toggleZFlow: () => void;
  setShowXFlow: (show: boolean) => void;
  setShowZFlow: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: "2d-slice",
  currentZSlice: 0,
  showXFlow: false,
  showZFlow: false,

  setViewMode: (mode) => set({ viewMode: mode }),

  setZSlice: (z) => set({ currentZSlice: z }),

  incrementZSlice: () => set((state) => ({ currentZSlice: state.currentZSlice + 1 })),

  decrementZSlice: () => set((state) => ({ currentZSlice: state.currentZSlice - 1 })),

  toggleXFlow: () => set((state) => ({ showXFlow: !state.showXFlow })),

  toggleZFlow: () => set((state) => ({ showZFlow: !state.showZFlow })),

  setShowXFlow: (show) => set({ showXFlow: show }),

  setShowZFlow: (show) => set({ showZFlow: show }),
}));
