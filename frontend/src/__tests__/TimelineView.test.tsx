/**
 * TimelineView Component Tests
 *
 * Tests for the schedule timeline visualization.
 */

import { TimelineView } from "@/components/timeline/TimelineView";
import { useProjectStore } from "@/stores/projectStore";
import type { ScheduleResult } from "@/types";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the project store
vi.mock("@/stores/projectStore", () => ({
  useProjectStore: vi.fn(),
}));

const mockUseProjectStore = vi.mocked(useProjectStore);

describe("TimelineView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should render placeholder when no schedule exists", () => {
    mockUseProjectStore.mockImplementation(() => undefined);

    render(<TimelineView />);

    expect(screen.getByText(/No schedule computed/i)).toBeDefined();
  });

  it("should render empty message when schedule has no timeline", () => {
    const emptySchedule: ScheduleResult = {
      prepareTime: {},
      measureTime: {},
      entangleTime: {},
      timeline: [],
    };

    mockUseProjectStore.mockImplementation(() => emptySchedule);

    render(<TimelineView />);

    expect(screen.getByText(/Schedule is empty/i)).toBeDefined();
  });

  it("should render timeline slices", () => {
    const schedule: ScheduleResult = {
      prepareTime: { n0: 0, n1: 1 },
      measureTime: { n0: 1, n1: 2 },
      entangleTime: { "n0-n1": 1 },
      timeline: [
        { time: 0, prepareNodes: ["n0"], entangleEdges: [], measureNodes: [] },
        { time: 1, prepareNodes: ["n1"], entangleEdges: ["n0-n1"], measureNodes: ["n0"] },
        { time: 2, prepareNodes: [], entangleEdges: [], measureNodes: ["n1"] },
      ],
    };

    mockUseProjectStore.mockImplementation(() => schedule);

    render(<TimelineView />);

    // Check time labels
    expect(screen.getByText("T = 0")).toBeDefined();
    expect(screen.getByText("T = 1")).toBeDefined();
    expect(screen.getByText("T = 2")).toBeDefined();

    // Check summary
    expect(screen.getByText(/3 steps/i)).toBeDefined();
  });

  it("should display node IDs in timeline", () => {
    const schedule: ScheduleResult = {
      prepareTime: { n0: 0 },
      measureTime: { n0: 1 },
      entangleTime: {},
      timeline: [
        { time: 0, prepareNodes: ["n0"], entangleEdges: [], measureNodes: [] },
        { time: 1, prepareNodes: [], entangleEdges: [], measureNodes: ["n0"] },
      ],
    };

    mockUseProjectStore.mockImplementation(() => schedule);

    render(<TimelineView />);

    // Node ID should appear in the timeline
    const n0Elements = screen.getAllByText("n0");
    expect(n0Elements.length).toBeGreaterThanOrEqual(2);
  });

  it("should display edge IDs in timeline", () => {
    const schedule: ScheduleResult = {
      prepareTime: { n0: 0 },
      measureTime: {},
      entangleTime: { "n0-n1": 0 },
      timeline: [{ time: 0, prepareNodes: ["n0"], entangleEdges: ["n0-n1"], measureNodes: [] }],
    };

    mockUseProjectStore.mockImplementation(() => schedule);

    render(<TimelineView />);

    expect(screen.getByText("n0-n1")).toBeDefined();
  });
});
