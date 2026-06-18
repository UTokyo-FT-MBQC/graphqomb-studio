/**
 * Ghost Node Component (React Flow Custom Node)
 *
 * Renders semi-transparent nodes from adjacent Z levels (z±1)
 * with 3D-like sphere appearance matching CustomNode styling.
 * - Semi-transparent appearance (enhanced in edge creation mode)
 * - Dashed outline effect
 * - Z-level label
 * - Not draggable or selectable
 * - Has handles for edge connections
 */

"use client";

import {
  SCHEDULE_OPERATION_COLORS,
  type ScheduleNodeHighlightKind,
} from "@/lib/scheduleVisualization";
import { useEdgeCreationStore } from "@/stores/edgeCreationStore";
import { useUIStore } from "@/stores/uiStore";
import type { GraphNode, NodeRole } from "@/types";
import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

export interface GhostNodeData {
  node: GraphNode;
  zOffset: number; // +1 for above, -1 for below current slice
  scheduleHighlightKind?: ScheduleNodeHighlightKind | undefined;
  isDimmedBySchedule?: boolean | undefined;
  isLiveBySchedule?: boolean | undefined;
  [key: string]: unknown;
}

interface GhostNodeProps {
  data: GhostNodeData;
}

// Ghost node colors (lighter versions for transparency effect)
const ghostStyles: Record<NodeRole, { baseColor: string; lightColor: string; darkColor: string }> =
  {
    input: {
      baseColor: "#86efac", // green-300
      lightColor: "#bbf7d0", // green-200
      darkColor: "#4ade80", // green-400
    },
    output: {
      baseColor: "#93c5fd", // blue-300
      lightColor: "#bfdbfe", // blue-200
      darkColor: "#60a5fa", // blue-400
    },
    intermediate: {
      baseColor: "#d1d5db", // gray-300
      lightColor: "#e5e7eb", // gray-200
      darkColor: "#9ca3af", // gray-400
    },
  };

// Node size (same as CustomNode)
const NODE_SIZE = 32;
const CENTER_HANDLE_CLASS =
  "!absolute !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !w-0 !h-0 !border-0 !bg-transparent !opacity-0 !pointer-events-none";

function GhostNodeComponent({ data }: GhostNodeProps): React.ReactNode {
  const { node } = data;
  const style = ghostStyles[node.role];
  const nodeZ = node.coordinate.z;

  // Node label visibility
  const showNodeLabels = useUIStore((s) => s.showNodeLabels);

  const isEdgeCreationMode = useEdgeCreationStore((state) => state.isEdgeCreationMode);
  const sourceNodeId = useEdgeCreationStore((state) => state.sourceNodeId);

  // Highlight ghost node when in edge creation mode
  const isSourceNode = sourceNodeId === node.id;
  const showEnhanced = isEdgeCreationMode;
  const scheduleHighlightKind = data.scheduleHighlightKind;
  const isDimmedBySchedule = data.isDimmedBySchedule === true;
  const isLiveBySchedule = data.isLiveBySchedule === true;

  // Determine opacity and glow based on state
  const opacity = isDimmedBySchedule
    ? 0.16
    : scheduleHighlightKind !== undefined || isLiveBySchedule
      ? 0.9
      : isSourceNode
        ? 0.9
        : showEnhanced
          ? 0.7
          : 0.5;
  const glowEffect =
    scheduleHighlightKind === "prep"
      ? "0 0 12px 3px rgba(147, 51, 234, 0.65)"
      : scheduleHighlightKind === "meas"
        ? "0 0 12px 3px rgba(22, 163, 74, 0.65)"
        : scheduleHighlightKind === "prep-meas"
          ? "0 0 12px 3px rgba(249, 115, 22, 0.65)"
          : isLiveBySchedule
            ? "0 0 7px 2px rgba(37, 99, 235, 0.4)"
            : isSourceNode
              ? "0 0 12px 3px rgba(168, 85, 247, 0.6)"
              : "none";
  const borderColor =
    scheduleHighlightKind === "prep"
      ? SCHEDULE_OPERATION_COLORS.prep
      : scheduleHighlightKind === "meas"
        ? SCHEDULE_OPERATION_COLORS.meas
        : scheduleHighlightKind === "prep-meas"
          ? SCHEDULE_OPERATION_COLORS.entangle
          : "rgba(156, 163, 175, 0.6)";

  return (
    <div className="relative flex flex-col items-center">
      {/* Node label (positioned above the node) */}
      {showNodeLabels && (
        <div
          className="absolute text-xs font-medium text-gray-400 whitespace-nowrap text-center"
          style={{
            top: -28,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <div>{node.id}</div>
          <div className="text-[10px] opacity-75">z={nodeZ}</div>
        </div>
      )}

      {/* Connection handles */}
      <Handle type="target" position={Position.Top} className={CENTER_HANDLE_CLASS} />

      {/* Sphere-like ghost node with dashed outline */}
      <div
        className={`rounded-full transition-all duration-150 ${showEnhanced ? "cursor-pointer" : ""}`}
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          opacity,
          background: `radial-gradient(circle at 30% 30%, ${style.lightColor}, ${style.baseColor} 50%, ${style.darkColor} 100%)`,
          boxShadow: glowEffect,
          border: `2px dashed ${borderColor}`,
        }}
        title={`${node.id} (z=${nodeZ})${isEdgeCreationMode ? " - Click to connect" : ""}`}
      />

      <Handle type="source" position={Position.Bottom} className={CENTER_HANDLE_CLASS} />
    </div>
  );
}

export const GhostNode = memo(GhostNodeComponent);
