/**
 * UI Store
 *
 * State store for UI-related settings like view mode, z-slice, flow toggles,
 * and 3D editing working plane configuration.
 */

import { create } from "zustand";

export type ViewMode = "2d-projection" | "2d-slice" | "3d-isometric";
export type WorkingPlane = "XY" | "XZ" | "YZ";

interface UIState {
  viewMode: ViewMode;
  currentZSlice: number;
  showXFlow: boolean;
  showZFlow: boolean;

  // 3D editing state
  workingPlane: WorkingPlane;
  workingPlaneOffset: number;
  is3DEditMode: boolean;
  showWorkingPlaneGrid: boolean;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setZSlice: (z: number) => void;
  incrementZSlice: () => void;
  decrementZSlice: () => void;
  toggleXFlow: () => void;
  toggleZFlow: () => void;
  setShowXFlow: (show: boolean) => void;
  setShowZFlow: (show: boolean) => void;

  // 3D editing actions
  setWorkingPlane: (plane: WorkingPlane) => void;
  setWorkingPlaneOffset: (offset: number) => void;
  set3DEditMode: (enabled: boolean) => void;
  toggle3DEditMode: () => void;
  toggleWorkingPlaneGrid: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: "2d-projection",
  currentZSlice: 0,
  showXFlow: false,
  showZFlow: false,

  // 3D editing defaults
  workingPlane: "XY",
  workingPlaneOffset: 0,
  is3DEditMode: false,
  showWorkingPlaneGrid: true,

  setViewMode: (mode) => set({ viewMode: mode }),

  setZSlice: (z) => set({ currentZSlice: z }),

  incrementZSlice: () => set((state) => ({ currentZSlice: state.currentZSlice + 1 })),

  decrementZSlice: () => set((state) => ({ currentZSlice: state.currentZSlice - 1 })),

  toggleXFlow: () => set((state) => ({ showXFlow: !state.showXFlow })),

  toggleZFlow: () => set((state) => ({ showZFlow: !state.showZFlow })),

  setShowXFlow: (show) => set({ showXFlow: show }),

  setShowZFlow: (show) => set({ showZFlow: show }),

  // 3D editing actions
  setWorkingPlane: (plane) => set({ workingPlane: plane }),

  setWorkingPlaneOffset: (offset) => set({ workingPlaneOffset: offset }),

  set3DEditMode: (enabled) => set({ is3DEditMode: enabled }),

  toggle3DEditMode: () => set((state) => ({ is3DEditMode: !state.is3DEditMode })),

  toggleWorkingPlaneGrid: () =>
    set((state) => ({ showWorkingPlaneGrid: !state.showWorkingPlaneGrid })),
}));
