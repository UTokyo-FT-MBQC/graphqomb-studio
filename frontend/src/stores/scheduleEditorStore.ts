/**
 * Schedule Editor Store
 *
 * State store for manual schedule editing.
 * Manages draft schedule entries for nodes and edges, edit mode, and locked items.
 * Provides hover/selection state for bidirectional canvas highlighting.
 */

import { create } from "zustand";

import type { ValidationResult } from "@/lib/api";
import type { GraphEdge, ScheduleResult, TimeSlice } from "@/types";

export type ScheduleMode = "auto" | "manual" | "hybrid";

export interface DraftScheduleEntry {
  nodeId: string;
  prepareTime: number | null;
  measureTime: number | null;
  locked: boolean;
}

export interface DraftEdgeEntry {
  edgeId: string;
  source: string;
  target: string;
  entangleTime: number | null;
  locked: boolean;
}

export interface DraftSchedule {
  mode: ScheduleMode;
  entries: Record<string, DraftScheduleEntry>;
  edgeEntries: Record<string, DraftEdgeEntry>;
  inputNodeIds: Set<string>;
}

interface ScheduleEditorState {
  // State
  isEditorOpen: boolean;
  draftSchedule: DraftSchedule | null;
  hoveredNodeId: string | null;
  selectedEntryId: string | null;
  hoveredEdgeId: string | null;
  selectedEdgeEntryId: string | null;
  isDirty: boolean;

  // Validation state
  validationResult: ValidationResult | null;
  isValidating: boolean;

  // Actions
  openEditor: () => void;
  closeEditor: () => void;
  toggleEditor: () => void;
  initializeDraft: (
    nodeIds: string[],
    edges: GraphEdge[],
    existingSchedule?: ScheduleResult,
    inputNodeIds?: string[]
  ) => void;
  setMode: (mode: ScheduleMode) => void;
  updateEntry: (nodeId: string, updates: Partial<Omit<DraftScheduleEntry, "nodeId">>) => void;
  toggleLock: (nodeId: string) => void;
  setHoveredNode: (nodeId: string | null) => void;
  selectEntry: (nodeId: string | null) => void;
  updateEdgeEntry: (
    edgeId: string,
    updates: Partial<Omit<DraftEdgeEntry, "edgeId" | "source" | "target">>
  ) => void;
  toggleEdgeLock: (edgeId: string) => void;
  setHoveredEdge: (edgeId: string | null) => void;
  selectEdgeEntry: (edgeId: string | null) => void;
  autoFillEdges: () => void;
  clearDraft: () => void;
  autoFillUnlocked: (schedule: ScheduleResult) => void;
  toScheduleResult: () => ScheduleResult | null;
  setValidationResult: (result: ValidationResult | null) => void;
  setIsValidating: (isValidating: boolean) => void;
  clearValidation: () => void;
  reset: () => void;
}

export const useScheduleEditorStore = create<ScheduleEditorState>((set, get) => ({
  isEditorOpen: false,
  draftSchedule: null,
  hoveredNodeId: null,
  selectedEntryId: null,
  hoveredEdgeId: null,
  selectedEdgeEntryId: null,
  isDirty: false,
  validationResult: null,
  isValidating: false,

  openEditor: () => set({ isEditorOpen: true }),

  closeEditor: () => set({ isEditorOpen: false }),

  toggleEditor: () => set((state) => ({ isEditorOpen: !state.isEditorOpen })),

  initializeDraft: (nodeIds, edges, existingSchedule, inputNodeIds) => {
    const entries: Record<string, DraftScheduleEntry> = {};
    for (const nodeId of nodeIds) {
      entries[nodeId] = {
        nodeId,
        prepareTime: existingSchedule?.prepareTime[nodeId] ?? null,
        measureTime: existingSchedule?.measureTime[nodeId] ?? null,
        locked: false,
      };
    }

    const edgeEntries: Record<string, DraftEdgeEntry> = {};
    for (const edge of edges) {
      edgeEntries[edge.id] = {
        edgeId: edge.id,
        source: edge.source,
        target: edge.target,
        entangleTime: existingSchedule?.entangleTime[edge.id] ?? null,
        locked: false,
      };
    }

    set({
      draftSchedule: {
        mode: "manual",
        entries,
        edgeEntries,
        inputNodeIds: new Set(inputNodeIds ?? []),
      },
      isDirty: false,
    });
  },

  setMode: (mode) =>
    set((state) => ({
      draftSchedule: state.draftSchedule ? { ...state.draftSchedule, mode } : null,
      isDirty: true,
    })),

  updateEntry: (nodeId, updates) =>
    set((state) => {
      if (!state.draftSchedule) return state;
      const entry = state.draftSchedule.entries[nodeId];
      if (!entry) return state;
      return {
        draftSchedule: {
          ...state.draftSchedule,
          entries: {
            ...state.draftSchedule.entries,
            [nodeId]: { ...entry, ...updates },
          },
        },
        isDirty: true,
        validationResult: null, // Clear validation on change
      };
    }),

  toggleLock: (nodeId) =>
    set((state) => {
      if (!state.draftSchedule) return state;
      const entry = state.draftSchedule.entries[nodeId];
      if (!entry) return state;
      return {
        draftSchedule: {
          ...state.draftSchedule,
          entries: {
            ...state.draftSchedule.entries,
            [nodeId]: { ...entry, locked: !entry.locked },
          },
        },
      };
    }),

  setHoveredNode: (nodeId) => set({ hoveredNodeId: nodeId }),

  selectEntry: (nodeId) => set({ selectedEntryId: nodeId }),

  updateEdgeEntry: (edgeId, updates) =>
    set((state) => {
      if (!state.draftSchedule) return state;
      const entry = state.draftSchedule.edgeEntries[edgeId];
      if (!entry) return state;
      return {
        draftSchedule: {
          ...state.draftSchedule,
          edgeEntries: {
            ...state.draftSchedule.edgeEntries,
            [edgeId]: { ...entry, ...updates },
          },
        },
        isDirty: true,
        validationResult: null, // Clear validation on change
      };
    }),

  toggleEdgeLock: (edgeId) =>
    set((state) => {
      if (!state.draftSchedule) return state;
      const entry = state.draftSchedule.edgeEntries[edgeId];
      if (!entry) return state;
      return {
        draftSchedule: {
          ...state.draftSchedule,
          edgeEntries: {
            ...state.draftSchedule.edgeEntries,
            [edgeId]: { ...entry, locked: !entry.locked },
          },
        },
      };
    }),

  setHoveredEdge: (edgeId) => set({ hoveredEdgeId: edgeId }),

  selectEdgeEntry: (edgeId) => set({ selectedEdgeEntryId: edgeId }),

  autoFillEdges: () =>
    set((state) => {
      if (!state.draftSchedule) return state;

      const { entries, edgeEntries, inputNodeIds } = state.draftSchedule;
      const newEdgeEntries = { ...edgeEntries };

      // Helper to get effective prepare time for a node:
      // - Input nodes: always ready at time -1
      // - Output nodes (not in entries): always ready at time -1
      // - Intermediate nodes with prepareTime set: use that value
      // - Intermediate nodes with prepareTime null: return null (not scheduled)
      const getEffectivePrepareTime = (nodeId: string): number | null => {
        if (inputNodeIds.has(nodeId)) {
          return -1; // Input nodes are always ready
        }
        const entry = entries[nodeId];
        if (!entry) {
          return -1; // Node not in entries (output node), treat as ready
        }
        return entry.prepareTime; // null if not scheduled, otherwise the time
      };

      for (const [edgeId, edgeEntry] of Object.entries(newEdgeEntries)) {
        // Skip locked edges
        if (edgeEntry.locked) continue;

        const sourcePrepare = getEffectivePrepareTime(edgeEntry.source);
        const targetPrepare = getEffectivePrepareTime(edgeEntry.target);

        // Skip if either node is an intermediate node that hasn't been scheduled yet
        if (sourcePrepare === null || targetPrepare === null) {
          continue;
        }

        // entangleTime = max(prepareTime[source], prepareTime[target])
        const entangleTime = Math.max(sourcePrepare, targetPrepare);

        // Only set if result is >= 0 (valid time)
        newEdgeEntries[edgeId] = {
          ...edgeEntry,
          entangleTime: entangleTime >= 0 ? entangleTime : null,
        };
      }

      return {
        draftSchedule: { ...state.draftSchedule, edgeEntries: newEdgeEntries },
        isDirty: true,
        validationResult: null, // Clear validation on change
      };
    }),

  clearDraft: () =>
    set((state) => {
      if (!state.draftSchedule) return state;

      const entries: Record<string, DraftScheduleEntry> = {};
      for (const [nodeId, entry] of Object.entries(state.draftSchedule.entries)) {
        if (entry.locked) {
          // Preserve locked entries
          entries[nodeId] = entry;
        } else {
          // Clear unlocked entries
          entries[nodeId] = { ...entry, prepareTime: null, measureTime: null };
        }
      }

      const edgeEntries: Record<string, DraftEdgeEntry> = {};
      for (const [edgeId, entry] of Object.entries(state.draftSchedule.edgeEntries)) {
        if (entry.locked) {
          // Preserve locked edge entries
          edgeEntries[edgeId] = entry;
        } else {
          // Clear unlocked edge entries
          edgeEntries[edgeId] = { ...entry, entangleTime: null };
        }
      }

      return {
        draftSchedule: { ...state.draftSchedule, entries, edgeEntries },
        isDirty: true,
        validationResult: null, // Clear validation on change
      };
    }),

  autoFillUnlocked: (schedule) =>
    set((state) => {
      if (!state.draftSchedule) return state;

      const entries = { ...state.draftSchedule.entries };
      for (const [nodeId, entry] of Object.entries(entries)) {
        if (!entry.locked) {
          entries[nodeId] = {
            ...entry,
            prepareTime: schedule.prepareTime[nodeId] ?? null,
            measureTime: schedule.measureTime[nodeId] ?? null,
          };
        }
      }

      const edgeEntries = { ...state.draftSchedule.edgeEntries };
      for (const [edgeId, entry] of Object.entries(edgeEntries)) {
        if (!entry.locked) {
          edgeEntries[edgeId] = {
            ...entry,
            entangleTime: schedule.entangleTime[edgeId] ?? null,
          };
        }
      }

      return {
        draftSchedule: { ...state.draftSchedule, entries, edgeEntries },
        isDirty: true,
        validationResult: null, // Clear validation on change
      };
    }),

  toScheduleResult: () => {
    const { draftSchedule } = get();
    if (!draftSchedule) return null;

    const prepareTime: Record<string, number | null> = {};
    const measureTime: Record<string, number | null> = {};
    const entangleTime: Record<string, number | null> = {};

    for (const entry of Object.values(draftSchedule.entries)) {
      prepareTime[entry.nodeId] = entry.prepareTime;
      measureTime[entry.nodeId] = entry.measureTime;
    }

    for (const entry of Object.values(draftSchedule.edgeEntries)) {
      entangleTime[entry.edgeId] = entry.entangleTime;
    }

    // Build timeline from entries
    const timeEvents: Map<number, TimeSlice> = new Map();

    for (const entry of Object.values(draftSchedule.entries)) {
      if (entry.prepareTime !== null) {
        if (!timeEvents.has(entry.prepareTime)) {
          timeEvents.set(entry.prepareTime, {
            time: entry.prepareTime,
            prepareNodes: [],
            entangleEdges: [],
            measureNodes: [],
          });
        }
        timeEvents.get(entry.prepareTime)?.prepareNodes.push(entry.nodeId);
      }

      if (entry.measureTime !== null) {
        if (!timeEvents.has(entry.measureTime)) {
          timeEvents.set(entry.measureTime, {
            time: entry.measureTime,
            prepareNodes: [],
            entangleEdges: [],
            measureNodes: [],
          });
        }
        timeEvents.get(entry.measureTime)?.measureNodes.push(entry.nodeId);
      }
    }

    // Add entangle edges to timeline
    for (const entry of Object.values(draftSchedule.edgeEntries)) {
      if (entry.entangleTime !== null) {
        if (!timeEvents.has(entry.entangleTime)) {
          timeEvents.set(entry.entangleTime, {
            time: entry.entangleTime,
            prepareNodes: [],
            entangleEdges: [],
            measureNodes: [],
          });
        }
        timeEvents.get(entry.entangleTime)?.entangleEdges.push(entry.edgeId);
      }
    }

    const timeline = Array.from(timeEvents.values()).sort((a, b) => a.time - b.time);

    return {
      prepareTime,
      measureTime,
      entangleTime,
      timeline,
    };
  },

  setValidationResult: (result) => set({ validationResult: result }),

  setIsValidating: (isValidating) => set({ isValidating }),

  clearValidation: () => set({ validationResult: null }),

  reset: () =>
    set({
      isEditorOpen: false,
      draftSchedule: null,
      hoveredNodeId: null,
      selectedEntryId: null,
      hoveredEdgeId: null,
      selectedEdgeEntryId: null,
      isDirty: false,
      validationResult: null,
      isValidating: false,
    }),
}));
