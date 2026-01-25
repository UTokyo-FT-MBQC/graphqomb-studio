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

import { useEdgeCreationStore } from "@/stores/edgeCreationStore";
import { useUIStore } from "@/stores/uiStore";
import type { GraphNode, NodeRole } from "@/types";
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

  // Determine opacity and glow based on state
  const opacity = isSourceNode ? 0.9 : showEnhanced ? 0.7 : 0.5;
  const glowEffect = isSourceNode ? "0 0 12px 3px rgba(168, 85, 247, 0.6)" : "none";

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
      <Handle
        type="target"
        position={Position.Top}
        className={`!w-2 !h-2 !border-0 !-top-1 ${
          showEnhanced ? "!bg-purple-400 !opacity-80 !w-3 !h-3" : "!bg-gray-300 !opacity-50"
        }`}
      />

      {/* Sphere-like ghost node with dashed outline */}
      <div
        className={`rounded-full transition-all duration-150 ${showEnhanced ? "cursor-pointer" : ""}`}
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          opacity,
          background: `radial-gradient(circle at 30% 30%, ${style.lightColor}, ${style.baseColor} 50%, ${style.darkColor} 100%)`,
          boxShadow: glowEffect,
          border: "2px dashed rgba(156, 163, 175, 0.6)",
        }}
        title={`${node.id} (z=${nodeZ})${isEdgeCreationMode ? " - Click to connect" : ""}`}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className={`!w-2 !h-2 !border-0 !-bottom-1 ${
          showEnhanced ? "!bg-purple-400 !opacity-80 !w-3 !h-3" : "!bg-gray-300 !opacity-50"
        }`}
      />
    </div>
  );
}

export const GhostNode = memo(GhostNodeComponent);
