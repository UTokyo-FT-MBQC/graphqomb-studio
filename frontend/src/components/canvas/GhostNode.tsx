/**
 * Ghost Node Component (React Flow Custom Node)
 *
 * Renders semi-transparent nodes from adjacent Z levels (z±1).
 * - Semi-transparent appearance
 * - Dashed border
 * - Z-level label
 * - Not draggable or selectable
 * - Has handles for edge connections
 */

"use client";

import type { GraphNode, NodeRole } from "@/types";
import { is3D } from "@/types";
import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

export interface GhostNodeData {
  node: GraphNode;
  zOffset: number; // +1 for above, -1 for below current slice
  [key: string]: unknown;
}

interface GhostNodeProps {
  data: GhostNodeData;
}

const ghostColors: Record<NodeRole, { bg: string; border: string; text: string }> = {
  input: {
    bg: "bg-green-50",
    border: "border-green-300",
    text: "text-green-400",
  },
  output: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-400",
  },
  intermediate: {
    bg: "bg-gray-50",
    border: "border-gray-300",
    text: "text-gray-400",
  },
};

function GhostNodeComponent({ data }: GhostNodeProps): React.ReactNode {
  const { node } = data;
  const colors = ghostColors[node.role];
  const nodeZ = is3D(node.coordinate) ? node.coordinate.z : 0;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-300 !w-2 !h-2 !opacity-50"
      />
      <div
        className={`
          px-3 py-2 rounded-full border-2 border-dashed min-w-[60px] text-center
          ${colors.bg} ${colors.border} ${colors.text}
          opacity-50
        `}
        title={`${node.id} (z=${nodeZ})`}
      >
        <div className="text-sm font-medium">{node.id}</div>
        <div className="text-xs opacity-75">z={nodeZ}</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-300 !w-2 !h-2 !opacity-50"
      />
    </>
  );
}

export const GhostNode = memo(GhostNodeComponent);
