/**
 * Schedule Editor Store
 *
 * State store for manual schedule editing.
 * Manages draft schedule entries, edit mode, and locked nodes.
 * Provides hover/selection state for bidirectional canvas highlighting.
 */

import { create } from "zustand";

import type { ScheduleResult, TimeSlice } from "@/types";

export type ScheduleMode = "auto" | "manual" | "hybrid";

export interface DraftScheduleEntry {
  nodeId: string;
  prepareTime: number | null;
  measureTime: number | null;
  locked: boolean;
}

export interface DraftSchedule {
  mode: ScheduleMode;
  entries: Record<string, DraftScheduleEntry>;
}

interface ScheduleEditorState {
  // State
  isEditorOpen: boolean;
  draftSchedule: DraftSchedule | null;
  hoveredNodeId: string | null;
  selectedEntryId: string | null;
  isDirty: boolean;

  // Actions
  openEditor: () => void;
  closeEditor: () => void;
  toggleEditor: () => void;
  initializeDraft: (nodeIds: string[], existingSchedule?: ScheduleResult) => void;
  setMode: (mode: ScheduleMode) => void;
  updateEntry: (nodeId: string, updates: Partial<Omit<DraftScheduleEntry, "nodeId">>) => void;
  toggleLock: (nodeId: string) => void;
  setHoveredNode: (nodeId: string | null) => void;
  selectEntry: (nodeId: string | null) => void;
  clearDraft: () => void;
  autoFillUnlocked: (schedule: ScheduleResult) => void;
  toScheduleResult: () => ScheduleResult | null;
  reset: () => void;
}

export const useScheduleEditorStore = create<ScheduleEditorState>((set, get) => ({
  isEditorOpen: false,
  draftSchedule: null,
  hoveredNodeId: null,
  selectedEntryId: null,
  isDirty: false,

  openEditor: () => set({ isEditorOpen: true }),

  closeEditor: () => set({ isEditorOpen: false }),

  toggleEditor: () => set((state) => ({ isEditorOpen: !state.isEditorOpen })),

  initializeDraft: (nodeIds, existingSchedule) => {
    const entries: Record<string, DraftScheduleEntry> = {};
    for (const nodeId of nodeIds) {
      entries[nodeId] = {
        nodeId,
        prepareTime: existingSchedule?.prepareTime[nodeId] ?? null,
        measureTime: existingSchedule?.measureTime[nodeId] ?? null,
        locked: false,
      };
    }
    set({
      draftSchedule: { mode: "manual", entries },
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
      return {
        draftSchedule: { ...state.draftSchedule, entries },
        isDirty: true,
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
      return {
        draftSchedule: { ...state.draftSchedule, entries },
        isDirty: true,
      };
    }),

  toScheduleResult: () => {
    const { draftSchedule } = get();
    if (!draftSchedule) return null;

    const prepareTime: Record<string, number | null> = {};
    const measureTime: Record<string, number | null> = {};

    for (const entry of Object.values(draftSchedule.entries)) {
      prepareTime[entry.nodeId] = entry.prepareTime;
      measureTime[entry.nodeId] = entry.measureTime;
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

    const timeline = Array.from(timeEvents.values()).sort((a, b) => a.time - b.time);

    return {
      prepareTime,
      measureTime,
      entangleTime: {}, // Not editable in Phase 1
      timeline,
    };
  },

  reset: () =>
    set({
      isEditorOpen: false,
      draftSchedule: null,
      hoveredNodeId: null,
      selectedEntryId: null,
      isDirty: false,
    }),
}));
