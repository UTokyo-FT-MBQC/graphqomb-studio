/**
 * Selection Store
 *
 * State store for tracking selected nodes and edges.
 * Selection is mutually exclusive (only one item can be selected at a time).
 */

import { create } from "zustand";

interface SelectionState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Actions
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedNodeId: null,
  selectedEdgeId: null,

  selectNode: (id) =>
    set({
      selectedNodeId: id,
      selectedEdgeId: null, // Clear edge selection when selecting a node
    }),

  selectEdge: (id) =>
    set({
      selectedNodeId: null, // Clear node selection when selecting an edge
      selectedEdgeId: id,
    }),

  clearSelection: () =>
    set({
      selectedNodeId: null,
      selectedEdgeId: null,
    }),
}));
