/**
 * Schedule Editor Store Tests
 *
 * Tests for the manual schedule editing state management.
 */

import { useScheduleEditorStore } from "@/stores/scheduleEditorStore";
import type { ScheduleResult } from "@/types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Helper to get draft entry with assertion
function getEntry(nodeId: string) {
  const { draftSchedule } = useScheduleEditorStore.getState();
  expect(draftSchedule).not.toBeNull();
  // biome-ignore lint/style/noNonNullAssertion: Asserted above
  const entry = draftSchedule!.entries[nodeId];
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
    it("should initialize draft from node IDs", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1", "n2"]);
      const { draftSchedule } = useScheduleEditorStore.getState();

      expect(draftSchedule).not.toBeNull();
      expect(draftSchedule?.mode).toBe("manual");
      expect(Object.keys(draftSchedule?.entries ?? {})).toHaveLength(3);
      expect(draftSchedule?.entries.n0).toEqual({
        nodeId: "n0",
        prepareTime: null,
        measureTime: null,
        locked: false,
      });
    });

    it("should initialize with existing schedule values", () => {
      const existingSchedule: ScheduleResult = {
        prepareTime: { n0: 0, n1: 1 },
        measureTime: { n0: 1, n1: 2 },
        entangleTime: {},
        timeline: [],
      };

      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"], existingSchedule);

      expect(getEntry("n0").prepareTime).toBe(0);
      expect(getEntry("n0").measureTime).toBe(1);
      expect(getEntry("n1").prepareTime).toBe(1);
      expect(getEntry("n1").measureTime).toBe(2);
    });

    it("should set isDirty to false after initialization", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0"]);
      const { isDirty } = useScheduleEditorStore.getState();
      expect(isDirty).toBe(false);
    });
  });

  describe("updateEntry", () => {
    it("should update entry times", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0"]);
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0, measureTime: 1 });

      expect(getEntry("n0").prepareTime).toBe(0);
      expect(getEntry("n0").measureTime).toBe(1);
    });

    it("should set isDirty to true after update", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0"]);
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0 });

      const { isDirty } = useScheduleEditorStore.getState();
      expect(isDirty).toBe(true);
    });

    it("should not update non-existent entry", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0"]);
      useScheduleEditorStore.getState().updateEntry("n1", { prepareTime: 0 });

      const { draftSchedule } = useScheduleEditorStore.getState();
      expect(draftSchedule?.entries.n1).toBeUndefined();
    });
  });

  describe("toggleLock", () => {
    it("should toggle lock state", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0"]);
      expect(getEntry("n0").locked).toBe(false);

      useScheduleEditorStore.getState().toggleLock("n0");
      expect(getEntry("n0").locked).toBe(true);

      useScheduleEditorStore.getState().toggleLock("n0");
      expect(getEntry("n0").locked).toBe(false);
    });
  });

  describe("clearDraft", () => {
    it("should clear unlocked entries", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"]);
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0, measureTime: 1 });
      useScheduleEditorStore.getState().updateEntry("n1", { prepareTime: 1, measureTime: 2 });

      useScheduleEditorStore.getState().clearDraft();

      expect(getEntry("n0").prepareTime).toBeNull();
      expect(getEntry("n0").measureTime).toBeNull();
      expect(getEntry("n1").prepareTime).toBeNull();
      expect(getEntry("n1").measureTime).toBeNull();
    });

    it("should preserve locked entries", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"]);
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0, measureTime: 1 });
      useScheduleEditorStore.getState().updateEntry("n1", { prepareTime: 1, measureTime: 2 });
      useScheduleEditorStore.getState().toggleLock("n0");

      useScheduleEditorStore.getState().clearDraft();

      expect(getEntry("n0").prepareTime).toBe(0); // Preserved
      expect(getEntry("n0").measureTime).toBe(1); // Preserved
      expect(getEntry("n1").prepareTime).toBeNull(); // Cleared
      expect(getEntry("n1").measureTime).toBeNull(); // Cleared
    });
  });

  describe("autoFillUnlocked", () => {
    it("should fill unlocked entries from schedule", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"]);

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
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"]);
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
  });

  describe("toScheduleResult", () => {
    it("should convert draft to ScheduleResult", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"]);
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0, measureTime: 1 });
      useScheduleEditorStore.getState().updateEntry("n1", { prepareTime: 1, measureTime: 2 });

      const result = useScheduleEditorStore.getState().toScheduleResult();

      expect(result).not.toBeNull();
      expect(result?.prepareTime.n0).toBe(0);
      expect(result?.prepareTime.n1).toBe(1);
      expect(result?.measureTime.n0).toBe(1);
      expect(result?.measureTime.n1).toBe(2);
    });

    it("should build timeline from entries", () => {
      useScheduleEditorStore.getState().initializeDraft(["n0", "n1"]);
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0, measureTime: 1 });
      useScheduleEditorStore.getState().updateEntry("n1", { prepareTime: 1, measureTime: 2 });

      const result = useScheduleEditorStore.getState().toScheduleResult();

      expect(result).not.toBeNull();
      // biome-ignore lint/style/noNonNullAssertion: Asserted above
      const timeline = result!.timeline;
      expect(timeline).toHaveLength(3); // Times 0, 1, 2

      const t0 = timeline.find((t) => t.time === 0);
      const t1 = timeline.find((t) => t.time === 1);
      const t2 = timeline.find((t) => t.time === 2);

      expect(t0).toBeDefined();
      expect(t0?.prepareNodes).toContain("n0");
      expect(t1).toBeDefined();
      expect(t1?.prepareNodes).toContain("n1");
      expect(t1?.measureNodes).toContain("n0");
      expect(t2).toBeDefined();
      expect(t2?.measureNodes).toContain("n1");
    });

    it("should return null if no draft", () => {
      const result = useScheduleEditorStore.getState().toScheduleResult();
      expect(result).toBeNull();
    });
  });

  describe("reset", () => {
    it("should reset all state", () => {
      useScheduleEditorStore.getState().openEditor();
      useScheduleEditorStore.getState().initializeDraft(["n0"]);
      useScheduleEditorStore.getState().setHoveredNode("n0");
      useScheduleEditorStore.getState().selectEntry("n0");
      useScheduleEditorStore.getState().updateEntry("n0", { prepareTime: 0 });

      useScheduleEditorStore.getState().reset();

      const state = useScheduleEditorStore.getState();
      expect(state.isEditorOpen).toBe(false);
      expect(state.draftSchedule).toBeNull();
      expect(state.hoveredNodeId).toBeNull();
      expect(state.selectedEntryId).toBeNull();
      expect(state.isDirty).toBe(false);
    });
  });
});
