import { getScheduleSliceHighlight, isNodeAliveAtTime } from "@/lib/scheduleVisualization";
import type { GraphNode, ScheduleResult } from "@/types";
import { describe, expect, it } from "vitest";

const nodes: GraphNode[] = [
  {
    id: "in0",
    role: "input",
    coordinate: { x: 0, y: 0, z: 0 },
    qubitIndex: 0,
    measBasis: { type: "axis", axis: "X", sign: "PLUS" },
  },
  {
    id: "n0",
    role: "intermediate",
    coordinate: { x: 1, y: 0, z: 0 },
    measBasis: { type: "axis", axis: "X", sign: "PLUS" },
  },
  {
    id: "n1",
    role: "intermediate",
    coordinate: { x: 2, y: 0, z: 0 },
    measBasis: { type: "axis", axis: "X", sign: "PLUS" },
  },
  {
    id: "out0",
    role: "output",
    coordinate: { x: 3, y: 0, z: 0 },
    qubitIndex: 0,
  },
];

const schedule: ScheduleResult = {
  prepareTime: { n0: 0, n1: 1 },
  measureTime: { in0: 2, n0: 2, n1: 3 },
  entangleTime: { "n0-n1": 1 },
  timeline: [
    { time: 0, prepareNodes: ["n0"], entangleEdges: [], measureNodes: [] },
    { time: 1, prepareNodes: ["n1"], entangleEdges: ["n0-n1"], measureNodes: [] },
    { time: 2, prepareNodes: [], entangleEdges: [], measureNodes: ["in0", "n0"] },
  ],
};

describe("scheduleVisualization", () => {
  it("should mark selected prep, entangle, and measure operations", () => {
    const highlight = getScheduleSliceHighlight(schedule, nodes, 1);

    expect(highlight?.nodeKinds.get("n1")).toBe("prep");
    expect(highlight?.edgeIds.has("n0-n1")).toBe(true);
    expect(highlight?.liveNodeIds.has("n0")).toBe(true);
    expect(highlight?.liveNodeIds.has("n1")).toBe(true);
  });

  it("should treat input nodes with no prepare time as live until measurement", () => {
    const inputNode = nodes.find((node) => node.id === "in0");
    expect(inputNode).toBeDefined();
    if (inputNode === undefined) {
      throw new Error("missing input node fixture");
    }

    expect(isNodeAliveAtTime(schedule, inputNode, 1)).toBe(true);
    expect(isNodeAliveAtTime(schedule, inputNode, 2)).toBe(false);
  });

  it("should treat unmeasured output nodes with no prepare time as live", () => {
    const outputNode = nodes.find((node) => node.id === "out0");
    expect(outputNode).toBeDefined();
    if (outputNode === undefined) {
      throw new Error("missing output node fixture");
    }

    expect(isNodeAliveAtTime(schedule, outputNode, 1)).toBe(true);
  });
});
