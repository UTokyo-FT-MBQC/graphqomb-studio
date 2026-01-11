/**
 * Schedule Editor Store Tests
 *
 * Tests for the manual schedule editing state management.
 */

import { useScheduleEditorStore } from "@/stores/scheduleEditorStore";
import type { GraphEdge, ScheduleResult } from "@/types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Helper edges for testing
const testEdges: GraphEdge[] = [
  { id: "n0-n1", source: "n0", target: "n1" },
  { id: "n1-n2", source: "n1", target: "n2" },
];

// Helper to get draft node entry with assertion
function getEntry(nodeId: string) {
  const { draftSchedule } = useScheduleEditorStore.getState();
  expect(draftSchedule).not.toBeNull();
  // biome-ignore lint/style/noNonNullAssertion: Asserted above
  const entry = draftSchedule!.entries[nodeId];
  expect(entry).toBeDefined();
  // biome-ignore lint/style/noNonNullAssertion: Asserted above
  return entry!;
}

// Helper to get draft edge entry with assertion
function getEdgeEntry(edgeId: string) {
  const { draftSchedule } = useScheduleEditorStore.getState();
  expect(draftSchedule).not.toBeNull();
  // biome-ignore lint/style/noNonNullAssertion: Asserted above
  const entry = draftSchedule!.edgeEntries[edgeId];
  expect(entry).toBeDefined();
  // biome-ignore lint/style/noNonNullAssertion: Asserted above
  return entry!;
}

describe("scheduleEditorStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useScheduleEditorStore.getState().reset();
  });

  afterEach(() => {
    useScheduleEditorStore.getState().reset();
  });

  describe("editor state", () => {
    it("should start with editor closed", () => {
      const { isEditorOpen } = useScheduleEditorStore.getState();
      expect(isEditorOpen).toBe(false);
    });

    it("should open editor", () => {
      useScheduleEditorStore.getState().openEditor();
      const { isEditorOpen } = useScheduleEditorStore.getState();
      expect(isEditorOpen).toBe(true);
    });

    it("should close editor", () => {
      useScheduleEditorStore.getState().openEditor();
      useScheduleEditorStore.getState().closeEditor();
      const { isEditorOpen } = useScheduleEditorStore.getState();
      expect(isEditorOpen).toBe(false);
    });

    it("should toggle editor", () => {
      useScheduleEditorStore.getState().toggleEditor();
      expect(useScheduleEditorStore.getState().isEditorOpen).toBe(true);
      useScheduleEditorStore.getState().toggleEditor();
      expect(useScheduleEditorStore.getState().isEditorOpen).toBe(false);
    });
  });

  describe("initializeDraft", () => {
    it("should initialize draft from node IDs and edges", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1", "n2"], testEdges);
      const { draftSchedule } = useScheduleEditorStore.getState();

      expect(draftSchedule).not.toBeNull();
      expect(draftSchedule?.mode).toBe("manual");
      expect(Object.keys(draftSchedule?.entries ?? {})).toHaveLength(3);
      expect(Object.keys(draftSchedule?.edgeEntries ?? {})).toHaveLength(2);
      expect(draftSchedule?.entries.n0).toEqual({
        nodeId: "n0",
        prepareTime: null,
        measureTime: null,
        locked: false,
      });
      expect(draftSchedule?.edgeEntries["n0-n1"]).toEqual({
        edgeId: "n0-n1",
        source: "n0",
        target: "n1",
        entangleTime: null,
        locked: false,
      });
    });

    it("should initialize with existing schedule values", () => {
      const existingSchedule: ScheduleResult = {
        prepareTime: { n0: 0, n1: 1 },
        measureTime: { n0: 1, n1: 2 },
        entangleTime: { "n0-n1": 0 },
        timeline: [],
      };

      useScheduleEditorStore
        .getState()
        // biome-ignore lint/style/noNonNullAssertion: Test data is known to exist
        .initializeDraft(["n0", "n1"], [testEdges[0]!], existingSchedule);

      expect(getEntry("n0").prepareTime).toBe(0);
      expect(getEntry("n0").measureTime).toBe(1);
      expect(getEntry("n1").prepareTime).toBe(1);
      expect(getEntry("n1").measureTime).toBe(2);
      expect(getEdgeEntry("n0-n1").entangleTime).toBe(0);
    });

    it("should set isDirty to false after initialization", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0"], []);
      const { isDirty } = useScheduleEditorStore.getState();
      expect(isDirty).toBe(false);
    });
  });

  describe("updateEntry", () => {
    it("should update entry times", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0"], []);
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0, measureTime: 1 });

      expect(getEntry("n0").prepareTime).toBe(0);
      expect(getEntry("n0").measureTime).toBe(1);
    });

    it("should set isDirty to true after update", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0"], []);
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0 });

      const { isDirty } = useScheduleEditorStore.getState();
      expect(isDirty).toBe(true);
    });

    it("should not update non-existent entry", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0"], []);
      useScheduleEditorStore.getState().updateEntry("n1", { prepareTime: 0 });

      const { draftSchedule } = useScheduleEditorStore.getState();
      expect(draftSchedule?.entries.n1).toBeUndefined();
    });
  });

  describe("toggleLock", () => {
    it("should toggle lock state", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0"], []);
      expect(getEntry("n0").locked).toBe(false);

      useScheduleEditorStore.getState().toggleLock("n0");
      expect(getEntry("n0").locked).toBe(true);

      useScheduleEditorStore.getState().toggleLock("n0");
      expect(getEntry("n0").locked).toBe(false);
    });
  });

  describe("clearDraft", () => {
    it("should clear unlocked entries", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"], []);
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0, measureTime: 1 });
      useScheduleEditorStore.getState().updateEntry("n1", { prepareTime: 1, measureTime: 2 });

      useScheduleEditorStore.getState().clearDraft();

      expect(getEntry("n0").prepareTime).toBeNull();
      expect(getEntry("n0").measureTime).toBeNull();
      expect(getEntry("n1").prepareTime).toBeNull();
      expect(getEntry("n1").measureTime).toBeNull();
    });

    it("should preserve locked entries", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"], []);
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0, measureTime: 1 });
      useScheduleEditorStore.getState().updateEntry("n1", { prepareTime: 1, measureTime: 2 });
      useScheduleEditorStore.getState().toggleLock("n0");

      useScheduleEditorStore.getState().clearDraft();

      expect(getEntry("n0").prepareTime).toBe(0); // Preserved
      expect(getEntry("n0").measureTime).toBe(1); // Preserved
      expect(getEntry("n1").prepareTime).toBeNull(); // Cleared
      expect(getEntry("n1").measureTime).toBeNull(); // Cleared
    });

    it("should clear unlocked edge entries", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"], testEdges);
      useScheduleEditorStore.getState().updateEdgeEntry("n0-n1", { entangleTime: 0 });
      useScheduleEditorStore.getState().updateEdgeEntry("n1-n2", { entangleTime: 1 });

      useScheduleEditorStore.getState().clearDraft();

      expect(getEdgeEntry("n0-n1").entangleTime).toBeNull();
      expect(getEdgeEntry("n1-n2").entangleTime).toBeNull();
    });

    it("should preserve locked edge entries", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1", "n2"], testEdges);
      useScheduleEditorStore.getState().updateEdgeEntry("n0-n1", { entangleTime: 0 });
      useScheduleEditorStore.getState().updateEdgeEntry("n1-n2", { entangleTime: 1 });
      useScheduleEditorStore.getState().toggleEdgeLock("n0-n1");

      useScheduleEditorStore.getState().clearDraft();

      expect(getEdgeEntry("n0-n1").entangleTime).toBe(0); // Preserved
      expect(getEdgeEntry("n1-n2").entangleTime).toBeNull(); // Cleared
    });
  });

  describe("autoFillUnlocked", () => {
    it("should fill unlocked entries from schedule", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"], []);

      const schedule: ScheduleResult = {
        prepareTime: { n0: 5, n1: 6 },
        measureTime: { n0: 7, n1: 8 },
        entangleTime: {},
        timeline: [],
      };

      useScheduleEditorStore.getState().autoFillUnlocked(schedule);

      expect(getEntry("n0").prepareTime).toBe(5);
      expect(getEntry("n0").measureTime).toBe(7);
      expect(getEntry("n1").prepareTime).toBe(6);
      expect(getEntry("n1").measureTime).toBe(8);
    });

    it("should not fill locked entries", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"], []);
      useScheduleEditorStore.getState().toggleLock("n0");

      const schedule: ScheduleResult = {
        prepareTime: { n0: 5, n1: 6 },
        measureTime: { n0: 7, n1: 8 },
        entangleTime: {},
        timeline: [],
      };

      useScheduleEditorStore.getState().autoFillUnlocked(schedule);

      expect(getEntry("n0").prepareTime).toBeNull(); // Not filled (locked)
      expect(getEntry("n0").measureTime).toBeNull(); // Not filled (locked)
      expect(getEntry("n1").prepareTime).toBe(6); // Filled
      expect(getEntry("n1").measureTime).toBe(8); // Filled
    });

    it("should fill unlocked edge entries from schedule", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"], testEdges);

      const schedule: ScheduleResult = {
        prepareTime: {},
        measureTime: {},
        entangleTime: { "n0-n1": 0, "n1-n2": 1 },
        timeline: [],
      };

      useScheduleEditorStore.getState().autoFillUnlocked(schedule);

      expect(getEdgeEntry("n0-n1").entangleTime).toBe(0);
      expect(getEdgeEntry("n1-n2").entangleTime).toBe(1);
    });

    it("should not fill locked edge entries", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1", "n2"], testEdges);
      useScheduleEditorStore.getState().toggleEdgeLock("n0-n1");

      const schedule: ScheduleResult = {
        prepareTime: {},
        measureTime: {},
        entangleTime: { "n0-n1": 5, "n1-n2": 6 },
        timeline: [],
      };

      useScheduleEditorStore.getState().autoFillUnlocked(schedule);

      expect(getEdgeEntry("n0-n1").entangleTime).toBeNull(); // Not filled (locked)
      expect(getEdgeEntry("n1-n2").entangleTime).toBe(6); // Filled
    });
  });

  describe("hover and selection", () => {
    it("should set hovered node", () => {
      useScheduleEditorStore.getState().setHoveredNode("n0");
      expect(useScheduleEditorStore.getState().hoveredNodeId).toBe("n0");

      useScheduleEditorStore.getState().setHoveredNode(null);
      expect(useScheduleEditorStore.getState().hoveredNodeId).toBeNull();
    });

    it("should set selected entry", () => {
      useScheduleEditorStore.getState().selectEntry("n0");
      expect(useScheduleEditorStore.getState().selectedEntryId).toBe("n0");

      useScheduleEditorStore.getState().selectEntry(null);
      expect(useScheduleEditorStore.getState().selectedEntryId).toBeNull();
    });

    it("should set hovered edge", () => {
      useScheduleEditorStore.getState().setHoveredEdge("n0-n1");
      expect(useScheduleEditorStore.getState().hoveredEdgeId).toBe("n0-n1");

      useScheduleEditorStore.getState().setHoveredEdge(null);
      expect(useScheduleEditorStore.getState().hoveredEdgeId).toBeNull();
    });

    it("should set selected edge entry", () => {
      useScheduleEditorStore.getState().selectEdgeEntry("n0-n1");
      expect(useScheduleEditorStore.getState().selectedEdgeEntryId).toBe("n0-n1");

      useScheduleEditorStore.getState().selectEdgeEntry(null);
      expect(useScheduleEditorStore.getState().selectedEdgeEntryId).toBeNull();
    });
  });

  describe("edge entry operations", () => {
    it("should update edge entry", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"], testEdges);
      useScheduleEditorStore.getState().updateEdgeEntry("n0-n1", { entangleTime: 5 });

      expect(getEdgeEntry("n0-n1").entangleTime).toBe(5);
    });

    it("should set isDirty to true after edge update", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"], testEdges);
      useScheduleEditorStore.getState().updateEdgeEntry("n0-n1", { entangleTime: 5 });

      const { isDirty } = useScheduleEditorStore.getState();
      expect(isDirty).toBe(true);
    });

    it("should toggle edge lock state", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"], testEdges);
      expect(getEdgeEntry("n0-n1").locked).toBe(false);

      useScheduleEditorStore.getState().toggleEdgeLock("n0-n1");
      expect(getEdgeEntry("n0-n1").locked).toBe(true);

      useScheduleEditorStore.getState().toggleEdgeLock("n0-n1");
      expect(getEdgeEntry("n0-n1").locked).toBe(false);
    });

    it("should not update non-existent edge entry", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"], testEdges);
      useScheduleEditorStore.getState().updateEdgeEntry("n2-n3", { entangleTime: 5 });

      const { draftSchedule } = useScheduleEditorStore.getState();
      expect(draftSchedule?.edgeEntries["n2-n3"]).toBeUndefined();
    });
  });

  describe("autoFillEdges", () => {
    it("should compute entangle time from node prepare times", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1", "n2"], testEdges);
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0 });
      useScheduleEditorStore.getState().updateEntry("n1", { prepareTime: 1 });
      useScheduleEditorStore.getState().updateEntry("n2", { prepareTime: 2 });

      useScheduleEditorStore.getState().autoFillEdges();

      // n0-n1: max(0, 1) = 1
      expect(getEdgeEntry("n0-n1").entangleTime).toBe(1);
      // n1-n2: max(1, 2) = 2
      expect(getEdgeEntry("n1-n2").entangleTime).toBe(2);
    });

    it("should not fill locked edges", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1", "n2"], testEdges);
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0 });
      useScheduleEditorStore.getState().updateEntry("n1", { prepareTime: 1 });
      useScheduleEditorStore.getState().updateEntry("n2", { prepareTime: 2 });
      useScheduleEditorStore.getState().toggleEdgeLock("n0-n1");

      useScheduleEditorStore.getState().autoFillEdges();

      // n0-n1 is locked, should remain null
      expect(getEdgeEntry("n0-n1").entangleTime).toBeNull();
      // n1-n2: max(1, 2) = 2
      expect(getEdgeEntry("n1-n2").entangleTime).toBe(2);
    });

    it("should handle input nodes (not in entries) as prepared at -1", () => {
      // Simulate input node by not including it in entries
      // biome-ignore lint/style/noNonNullAssertion: Test data is known to exist
      useScheduleEditorStore.getState().initializeDraft(["n1"], [testEdges[0]!]);
      useScheduleEditorStore.getState().updateEntry("n1", { prepareTime: 1 });

      useScheduleEditorStore.getState().autoFillEdges();

      // n0 is not in entries (input node), treated as -1
      // n0-n1: max(-1, 1) = 1
      expect(getEdgeEntry("n0-n1").entangleTime).toBe(1);
    });

    it("should not set negative entangle time", () => {
      // Both nodes not in entries (both input nodes)
      // biome-ignore lint/style/noNonNullAssertion: Test data is known to exist
      useScheduleEditorStore.getState().initializeDraft([], [testEdges[0]!]);

      useScheduleEditorStore.getState().autoFillEdges();

      // Both nodes treated as -1, max(-1, -1) = -1 < 0, should remain null
      expect(getEdgeEntry("n0-n1").entangleTime).toBeNull();
    });

    it("should treat input nodes (not in entries) as prepared at -1", () => {
      // n0 is an input node (not in entries), n1 is intermediate/output
      // biome-ignore lint/style/noNonNullAssertion: Test data is known to exist
      useScheduleEditorStore.getState().initializeDraft(["n1"], [testEdges[0]!]);

      // Set only scheduled node's prepareTime
      useScheduleEditorStore.getState().updateEntry("n1", { prepareTime: 1 });

      useScheduleEditorStore.getState().autoFillEdges();

      // n0 is not in entries (input node), treated as -1
      // n0-n1: max(-1, 1) = 1
      expect(getEdgeEntry("n0-n1").entangleTime).toBe(1);
    });

    it("should skip edges with unscheduled non-input nodes", () => {
      // n0 and n1 are both in entries (intermediate/output), but n0 has no prepareTime
      // biome-ignore lint/style/noNonNullAssertion: Test data is known to exist
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"], [testEdges[0]!]);

      // Only set n1's prepareTime, leave n0 unscheduled
      useScheduleEditorStore.getState().updateEntry("n1", { prepareTime: 1 });

      useScheduleEditorStore.getState().autoFillEdges();

      // n0 is in entries but has null prepareTime, should skip this edge
      expect(getEdgeEntry("n0-n1").entangleTime).toBeNull();
    });
  });

  describe("toScheduleResult", () => {
    it("should convert draft to ScheduleResult", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"], []);
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0, measureTime: 1 });
      useScheduleEditorStore.getState().updateEntry("n1", { prepareTime: 1, measureTime: 2 });

      const result = useScheduleEditorStore.getState().toScheduleResult();

      expect(result).not.toBeNull();
      expect(result?.prepareTime.n0).toBe(0);
      expect(result?.prepareTime.n1).toBe(1);
      expect(result?.measureTime.n0).toBe(1);
      expect(result?.measureTime.n1).toBe(2);
    });

    it("should include entangle times in result", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"], testEdges);
      useScheduleEditorStore.getState().updateEdgeEntry("n0-n1", { entangleTime: 0 });
      useScheduleEditorStore.getState().updateEdgeEntry("n1-n2", { entangleTime: 1 });

      const result = useScheduleEditorStore.getState().toScheduleResult();

      expect(result).not.toBeNull();
      expect(result?.entangleTime["n0-n1"]).toBe(0);
      expect(result?.entangleTime["n1-n2"]).toBe(1);
    });

    it("should build timeline from entries including edges", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"], testEdges);
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0, measureTime: 2 });
      useScheduleEditorStore.getState().updateEntry("n1", { prepareTime: 1, measureTime: 3 });
      useScheduleEditorStore.getState().updateEdgeEntry("n0-n1", { entangleTime: 1 });

      const result = useScheduleEditorStore.getState().toScheduleResult();

      expect(result).not.toBeNull();
      // biome-ignore lint/style/noNonNullAssertion: Asserted above
      const timeline = result!.timeline;

      const t1 = timeline.find((t) => t.time === 1);
      expect(t1).toBeDefined();
      expect(t1?.prepareNodes).toContain("n1");
      expect(t1?.entangleEdges).toContain("n0-n1");
    });

    it("should return null if no draft", () => {
      const result = useScheduleEditorStore.getState().toScheduleResult();
      expect(result).toBeNull();
    });
  });

  describe("reset", () => {
    it("should reset all state including edge state", () => {
      useScheduleEditorStore.getState().openEditor();
      useScheduleEditorStore.getState().initializeDraft(["n0"], testEdges);
      useScheduleEditorStore.getState().setHoveredNode("n0");
      useScheduleEditorStore.getState().selectEntry("n0");
      useScheduleEditorStore.getState().setHoveredEdge("n0-n1");
      useScheduleEditorStore.getState().selectEdgeEntry("n0-n1");
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0 });

      useScheduleEditorStore.getState().reset();

      const state = useScheduleEditorStore.getState();
      expect(state.isEditorOpen).toBe(false);
      expect(state.draftSchedule).toBeNull();
      expect(state.hoveredNodeId).toBeNull();
      expect(state.selectedEntryId).toBeNull();
      expect(state.hoveredEdgeId).toBeNull();
      expect(state.selectedEdgeEntryId).toBeNull();
      expect(state.isDirty).toBe(false);
    });
  });
});
