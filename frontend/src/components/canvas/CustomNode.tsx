/**
 * Custom Node Component
 *
 * Renders nodes with role-based colors matching 3D viewer style:
 * - input: green (#22c55e)
 * - output: blue (#3b82f6)
 * - intermediate: gray (#6b7280)
 *
 * Features 3D-like sphere appearance with:
 * - Radial gradient for depth effect
 * - Emissive-like glow for selection states
 * - Label positioned above node
 */

"use client";

import { useEdgeCreationStore } from "@/stores/edgeCreationStore";
import { useScheduleEditorStore } from "@/stores/scheduleEditorStore";
import { useUIStore } from "@/stores/uiStore";
import type { GraphNode, NodeRole } from "@/types";
import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

export interface CustomNodeData {
  node: GraphNode;
  [key: string]: unknown;
}

// Role-based colors matching 3D viewer (saturated colors for sphere appearance)
const roleStyles: Record<
  NodeRole,
  { baseColor: string; lightColor: string; darkColor: string; shadowColor: string }
> = {
  input: {
    baseColor: "#22c55e", // green-500
    lightColor: "#4ade80", // green-400 (highlight)
    darkColor: "#16a34a", // green-600 (shadow)
    shadowColor: "rgba(34, 197, 94, 0.6)",
  },
  output: {
    baseColor: "#3b82f6", // blue-500
    lightColor: "#60a5fa", // blue-400 (highlight)
    darkColor: "#2563eb", // blue-600 (shadow)
    shadowColor: "rgba(59, 130, 246, 0.6)",
  },
  intermediate: {
    baseColor: "#6b7280", // gray-500
    lightColor: "#9ca3af", // gray-400 (highlight)
    darkColor: "#4b5563", // gray-600 (shadow)
    shadowColor: "rgba(107, 114, 128, 0.6)",
  },
};

// Selection state glow colors (matching 3D emissive effects)
const selectionGlows = {
  selected: "0 0 12px 3px rgba(255, 255, 255, 0.8), 0 0 20px 6px rgba(59, 130, 246, 0.4)",
  edgeSource: "0 0 12px 3px rgba(168, 85, 247, 0.8), 0 0 20px 6px rgba(168, 85, 247, 0.5)",
  scheduleHighlight: "0 0 12px 3px rgba(249, 115, 22, 0.8), 0 0 20px 6px rgba(249, 115, 22, 0.5)",
};

// Node size (diameter in pixels)
const NODE_SIZE = 32;

interface CustomNodeProps {
  data: CustomNodeData;
  selected?: boolean;
}

function CustomNodeComponent({ data, selected }: CustomNodeProps): React.ReactNode {
  const { node } = data;
  const style = roleStyles[node.role];

  // Node label visibility
  const showNodeLabels = useUIStore((s) => s.showNodeLabels);

  // Edge creation state
  const isEdgeCreationMode = useEdgeCreationStore((s) => s.isEdgeCreationMode);
  const sourceNodeId = useEdgeCreationStore((s) => s.sourceNodeId);
  const isSourceNode = isEdgeCreationMode && sourceNodeId === node.id;

  // Schedule editor highlight state
  const hoveredNodeId = useScheduleEditorStore((s) => s.hoveredNodeId);
  const selectedEntryId = useScheduleEditorStore((s) => s.selectedEntryId);
  const isEditorOpen = useScheduleEditorStore((s) => s.isEditorOpen);
  const isScheduleHighlighted =
    isEditorOpen && (hoveredNodeId === node.id || selectedEntryId === node.id);

  // Determine glow effect based on state priority
  let glowEffect = "none";
  if (isScheduleHighlighted) {
    glowEffect = selectionGlows.scheduleHighlight;
  } else if (isSourceNode) {
    glowEffect = selectionGlows.edgeSource;
  } else if (selected === true) {
    glowEffect = selectionGlows.selected;
  }

  // Scale up slightly when source node in edge creation mode (matching 3D behavior)
  const scale = isSourceNode ? 1.2 : 1;

  return (
    <div className="relative flex flex-col items-center">
      {/* Node label (positioned above the node) */}
      {showNodeLabels && (
        <div
          className="absolute text-xs font-medium text-gray-700 whitespace-nowrap"
          style={{
            top: -20,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {node.id}
        </div>
      )}

      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !w-2 !h-2 !border-0 !-top-1"
      />

      {/* Sphere-like node */}
      <div
        className="rounded-full transition-all duration-150"
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          transform: `scale(${scale})`,
          background: `radial-gradient(circle at 30% 30%, ${style.lightColor}, ${style.baseColor} 50%, ${style.darkColor} 100%)`,
          boxShadow: glowEffect !== "none" ? glowEffect : `2px 4px 8px ${style.shadowColor}`,
          border: "1px solid rgba(255, 255, 255, 0.3)",
        }}
        title={showNodeLabels ? undefined : node.id}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400 !w-2 !h-2 !border-0 !-bottom-1"
      />
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
