/**
 * TilingPreview2D Component
 *
 * Renders a semi-transparent preview of the tiling pattern on the 2D canvas.
 * Uses React Flow's viewport transformation for correct positioning.
 */

"use client";

import { SCALE } from "@/lib/geometry";
import { useTilingStore } from "@/stores/tilingStore";
import type { GeneratedEdge, GeneratedNode } from "@/types/tiling";
import { useViewport } from "@xyflow/react";

/**
 * Convert graph coordinate to screen position.
 */
function toScreenPosition(x: number, y: number): { x: number; y: number } {
  return {
    x: x * SCALE,
    y: y * SCALE,
  };
}

interface PreviewNodeProps {
  node: GeneratedNode;
  viewport: { x: number; y: number; zoom: number };
}

function PreviewNode({ node, viewport }: PreviewNodeProps): React.ReactNode {
  const { x, y } = toScreenPosition(node.position[0], node.position[1]);

  // Apply viewport transformation
  const screenX = x * viewport.zoom + viewport.x;
  const screenY = y * viewport.zoom + viewport.y;

  // Node radius (scaled with zoom)
  const radius = 8 * viewport.zoom;

  return (
    <circle
      cx={screenX}
      cy={screenY}
      r={radius}
      fill="rgba(147, 51, 234, 0.3)"
      stroke="rgba(147, 51, 234, 0.6)"
      strokeWidth={2}
      strokeDasharray="4 2"
    />
  );
}

interface PreviewEdgeProps {
  edge: GeneratedEdge;
  nodes: Map<string, GeneratedNode>;
  viewport: { x: number; y: number; zoom: number };
}

function PreviewEdge({ edge, nodes, viewport }: PreviewEdgeProps): React.ReactNode {
  const sourceNode = nodes.get(edge.source);
  const targetNode = nodes.get(edge.target);

  if (sourceNode === undefined || targetNode === undefined) {
    return null;
  }

  const source = toScreenPosition(sourceNode.position[0], sourceNode.position[1]);
  const target = toScreenPosition(targetNode.position[0], targetNode.position[1]);

  // Apply viewport transformation
  const sourceX = source.x * viewport.zoom + viewport.x;
  const sourceY = source.y * viewport.zoom + viewport.y;
  const targetX = target.x * viewport.zoom + viewport.x;
  const targetY = target.y * viewport.zoom + viewport.y;

  return (
    <line
      x1={sourceX}
      y1={sourceY}
      x2={targetX}
      y2={targetY}
      stroke="rgba(147, 51, 234, 0.4)"
      strokeWidth={2}
      strokeDasharray="6 3"
    />
  );
}

interface DragRectProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  viewport: { x: number; y: number; zoom: number };
}

function DragRect({ startX, startY, endX, endY, viewport }: DragRectProps): React.ReactNode {
  const start = toScreenPosition(startX, startY);
  const end = toScreenPosition(endX, endY);

  // Apply viewport transformation
  const x1 = start.x * viewport.zoom + viewport.x;
  const y1 = start.y * viewport.zoom + viewport.y;
  const x2 = end.x * viewport.zoom + viewport.x;
  const y2 = end.y * viewport.zoom + viewport.y;

  const rectX = Math.min(x1, x2);
  const rectY = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);

  return (
    <rect
      x={rectX}
      y={rectY}
      width={width}
      height={height}
      fill="rgba(147, 51, 234, 0.1)"
      stroke="rgba(147, 51, 234, 0.5)"
      strokeWidth={1}
      strokeDasharray="8 4"
    />
  );
}

export function TilingPreview2D(): React.ReactNode {
  const viewport = useViewport();
  const previewGraph = useTilingStore((state) => state.previewGraph);
  const dragStart = useTilingStore((state) => state.dragStart);
  const dragEnd = useTilingStore((state) => state.dragEnd);
  const isDragging = useTilingStore((state) => state.isDragging);

  // Build node lookup map for edge rendering
  const nodeMap = new Map<string, GeneratedNode>();
  if (previewGraph !== null) {
    for (const node of previewGraph.nodes) {
      nodeMap.set(node.id, node);
    }
  }

  const hasPreview = previewGraph !== null && previewGraph.nodes.length > 0;
  const hasDragRect = dragStart !== null && dragEnd !== null;

  if (!hasPreview && !hasDragRect) {
    return null;
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
      role="img"
      aria-label="Tiling preview overlay"
    >
      {/* Drag rectangle (during dragging) */}
      {hasDragRect && isDragging && (
        <DragRect
          startX={dragStart.x}
          startY={dragStart.y}
          endX={dragEnd.x}
          endY={dragEnd.y}
          viewport={viewport}
        />
      )}

      {/* Preview edges */}
      {hasPreview &&
        previewGraph.edges.map((edge) => (
          <PreviewEdge key={edge.id} edge={edge} nodes={nodeMap} viewport={viewport} />
        ))}

      {/* Preview nodes */}
      {hasPreview &&
        previewGraph.nodes.map((node) => (
          <PreviewNode key={node.id} node={node} viewport={viewport} />
        ))}
    </svg>
  );
}
