/**
 * Edge Creation Store
 *
 * State store for managing edge creation mode.
 * Allows sequential node selection to create edges across Z layers.
 */

import { create } from "zustand";

interface EdgeCreationState {
  isEdgeCreationMode: boolean;
  sourceNodeId: string | null;

  // Actions
  enterEdgeCreationMode: () => void;
  exitEdgeCreationMode: () => void;
  setSourceNode: (nodeId: string) => void;
  clearSourceNode: () => void;
  reset: () => void;
}

export const useEdgeCreationStore = create<EdgeCreationState>((set) => ({
  isEdgeCreationMode: false,
  sourceNodeId: null,

  enterEdgeCreationMode: () =>
    set({
      isEdgeCreationMode: true,
      sourceNodeId: null,
    }),

  exitEdgeCreationMode: () =>
    set({
      isEdgeCreationMode: false,
      sourceNodeId: null,
    }),

  setSourceNode: (nodeId) =>
    set({
      sourceNodeId: nodeId,
    }),

  clearSourceNode: () =>
    set({
      sourceNodeId: null,
    }),

  reset: () =>
    set({
      isEdgeCreationMode: false,
      sourceNodeId: null,
    }),
}));
