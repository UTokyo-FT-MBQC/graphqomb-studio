import type { GraphEdge, GraphNode, ScheduleResult, TimeSlice } from "@/types";

export type ScheduleNodeHighlightKind = "prep" | "meas" | "prep-meas";

export const SCHEDULE_OPERATION_COLORS = {
  prep: "#9333ea",
  entangle: "#f97316",
  meas: "#16a34a",
  live: "#2563eb",
} as const;

export interface ScheduleSliceHighlight {
  nodeKinds: Map<string, ScheduleNodeHighlightKind>;
  edgeIds: Set<string>;
  liveNodeIds: Set<string>;
}

export function getSelectedTimeSlice(
  schedule: ScheduleResult | undefined,
  selectedTime: number | null
): TimeSlice | undefined {
  if (schedule === undefined || selectedTime === null) {
    return undefined;
  }
  return schedule.timeline.find((slice) => slice.time === selectedTime);
}

export function getScheduleSliceHighlight(
  schedule: ScheduleResult | undefined,
  nodes: readonly GraphNode[],
  selectedTime: number | null
): ScheduleSliceHighlight | null {
  const selectedSlice = getSelectedTimeSlice(schedule, selectedTime);
  if (schedule === undefined || selectedSlice === undefined) {
    return null;
  }

  const nodeKinds = new Map<string, ScheduleNodeHighlightKind>();
  for (const nodeId of selectedSlice.prepareNodes) {
    nodeKinds.set(nodeId, "prep");
  }
  for (const nodeId of selectedSlice.measureNodes) {
    nodeKinds.set(nodeId, nodeKinds.has(nodeId) ? "prep-meas" : "meas");
  }

  return {
    nodeKinds,
    edgeIds: new Set(selectedSlice.entangleEdges),
    liveNodeIds: getLiveNodeIds(schedule, nodes, selectedSlice.time),
  };
}

export function getLiveNodeIds(
  schedule: ScheduleResult,
  nodes: readonly GraphNode[],
  time: number
): Set<string> {
  const liveNodeIds = new Set<string>();

  for (const node of nodes) {
    if (isNodeAliveAtTime(schedule, node, time)) {
      liveNodeIds.add(node.id);
    }
  }

  return liveNodeIds;
}

export function isNodeAliveAtTime(
  schedule: ScheduleResult,
  node: GraphNode,
  time: number
): boolean {
  const prepareTime = schedule.prepareTime[node.id] ?? null;
  const measureTime = schedule.measureTime[node.id] ?? null;

  const isPrepared = prepareTime === null ? node.role === "input" : prepareTime <= time;
  const isMeasured = measureTime !== null && measureTime <= time;

  return isPrepared && !isMeasured;
}

export function isEdgeLiveAtTime(edge: GraphEdge, liveNodeIds: ReadonlySet<string>): boolean {
  return liveNodeIds.has(edge.source) && liveNodeIds.has(edge.target);
}
