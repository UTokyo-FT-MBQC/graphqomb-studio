/**
 * Custom Node Component
 *
 * Renders nodes with role-based colors:
 * - input: green
 * - output: blue
 * - intermediate: gray
 *
 * Also supports schedule editor highlighting:
 * - orange ring when hovered or selected in schedule editor
 */

"use client";

import { useScheduleEditorStore } from "@/stores/scheduleEditorStore";
import { useUIStore } from "@/stores/uiStore";
import type { GraphNode, NodeRole } from "@/types";
import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

export interface CustomNodeData {
  node: GraphNode;
  [key: string]: unknown;
}

const roleColors: Record<NodeRole, { bg: string; border: string; text: string }> = {
  input: {
    bg: "bg-green-100",
    border: "border-green-500",
    text: "text-green-700",
  },
  output: {
    bg: "bg-blue-100",
    border: "border-blue-500",
    text: "text-blue-700",
  },
  intermediate: {
    bg: "bg-gray-100",
    border: "border-gray-500",
    text: "text-gray-700",
  },
};

interface CustomNodeProps {
  data: CustomNodeData;
  selected?: boolean;
}

function CustomNodeComponent({ data, selected }: CustomNodeProps): React.ReactNode {
  const { node } = data;
  const colors = roleColors[node.role];

  // Node label visibility
  const showNodeLabels = useUIStore((s) => s.showNodeLabels);

  // Schedule editor highlight state
  const hoveredNodeId = useScheduleEditorStore((s) => s.hoveredNodeId);
  const selectedEntryId = useScheduleEditorStore((s) => s.selectedEntryId);
  const isEditorOpen = useScheduleEditorStore((s) => s.isEditorOpen);

  // Show orange highlight when hovered or selected in schedule editor
  const isScheduleHighlighted =
    isEditorOpen && (hoveredNodeId === node.id || selectedEntryId === node.id);

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2" />
      <div
        className={`
          px-3 py-2 rounded-full border-2 min-w-[60px] text-center
          ${colors.bg} ${colors.border} ${colors.text}
          ${selected === true ? "ring-2 ring-offset-1 ring-blue-400" : ""}
          ${isScheduleHighlighted ? "ring-2 ring-offset-1 ring-orange-400 shadow-lg" : ""}
          transition-all duration-150
        `}
        title={showNodeLabels ? undefined : node.id}
      >
        {showNodeLabels && <div className="text-sm font-medium">{node.id}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2" />
    </>
  );
}

export const CustomNode = memo(CustomNodeComponent);
