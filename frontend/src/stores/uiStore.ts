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

  // Ghost node display range (Z distance threshold)
  ghostZRange: number;

  // 3D editing state
  workingPlane: WorkingPlane;
  workingPlaneOffset: number;
  is3DEditMode: boolean;
  showWorkingPlaneGrid: boolean;

  // Tiling mode
  isTilingMode: boolean;

  // 3D Tiling dialog
  is3DTilingDialogOpen: boolean;

  // Node label display
  showNodeLabels: boolean;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setZSlice: (z: number) => void;
  incrementZSlice: () => void;
  decrementZSlice: () => void;
  toggleXFlow: () => void;
  toggleZFlow: () => void;
  setShowXFlow: (show: boolean) => void;
  setShowZFlow: (show: boolean) => void;
  setGhostZRange: (range: number) => void;

  // 3D editing actions
  setWorkingPlane: (plane: WorkingPlane) => void;
  setWorkingPlaneOffset: (offset: number) => void;
  set3DEditMode: (enabled: boolean) => void;
  toggle3DEditMode: () => void;
  toggleWorkingPlaneGrid: () => void;

  // Tiling mode actions
  setTilingMode: (enabled: boolean) => void;
  toggleTilingMode: () => void;

  // 3D Tiling dialog actions
  open3DTilingDialog: () => void;
  close3DTilingDialog: () => void;

  // Node label display actions
  setShowNodeLabels: (show: boolean) => void;
  toggleNodeLabels: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: "2d-projection",
  currentZSlice: 0,
  showXFlow: false,
  showZFlow: false,

  // Ghost node display range (default: show nodes within Z distance <= 1)
  ghostZRange: 1,

  // 3D editing defaults
  workingPlane: "XY",
  workingPlaneOffset: 0,
  is3DEditMode: false,
  showWorkingPlaneGrid: true,

  // Tiling mode default
  isTilingMode: false,

  // 3D Tiling dialog default
  is3DTilingDialogOpen: false,

  // Node label display (default: show labels)
  showNodeLabels: true,

  setViewMode: (mode) => set({ viewMode: mode }),

  setZSlice: (z) => set({ currentZSlice: z }),

  incrementZSlice: () => set((state) => ({ currentZSlice: state.currentZSlice + 1 })),

  decrementZSlice: () => set((state) => ({ currentZSlice: state.currentZSlice - 1 })),

  toggleXFlow: () => set((state) => ({ showXFlow: !state.showXFlow })),

  toggleZFlow: () => set((state) => ({ showZFlow: !state.showZFlow })),

  setShowXFlow: (show) => set({ showXFlow: show }),

  setShowZFlow: (show) => set({ showZFlow: show }),

  setGhostZRange: (range) => set({ ghostZRange: range }),

  // 3D editing actions
  setWorkingPlane: (plane) => set({ workingPlane: plane }),

  setWorkingPlaneOffset: (offset) => set({ workingPlaneOffset: offset }),

  set3DEditMode: (enabled) => set({ is3DEditMode: enabled }),

  toggle3DEditMode: () => set((state) => ({ is3DEditMode: !state.is3DEditMode })),

  toggleWorkingPlaneGrid: () =>
    set((state) => ({ showWorkingPlaneGrid: !state.showWorkingPlaneGrid })),

  // Tiling mode actions
  setTilingMode: (enabled) => set({ isTilingMode: enabled }),

  toggleTilingMode: () => set((state) => ({ isTilingMode: !state.isTilingMode })),

  // 3D Tiling dialog actions
  open3DTilingDialog: () => set({ is3DTilingDialogOpen: true }),

  close3DTilingDialog: () => set({ is3DTilingDialogOpen: false }),

  // Node label display actions
  setShowNodeLabels: (show) => set({ showNodeLabels: show }),

  toggleNodeLabels: () => set((state) => ({ showNodeLabels: !state.showNodeLabels })),
}));
