/**
 * Flow Overlay
 *
 * Renders flow arrows (X-Flow and Z-Flow) as SVG overlay on the canvas.
 * - X-Flow: Red arrows
 * - Z-Flow: Blue arrows
 *
 * Uses React Flow's Panel component for proper positioning with pan/zoom.
 */

"use client";

import { useProjectStore } from "@/stores/projectStore";
import { useResolvedFlowStore } from "@/stores/resolvedFlowStore";
import { useUIStore } from "@/stores/uiStore";
import { Panel, useNodes, useViewport } from "@xyflow/react";
import { useMemo } from "react";

// Arrow offset from node center (to avoid overlapping with node)
const ARROW_OFFSET = 20;

interface ArrowData {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Calculate arrow start and end points with offset
function calculateArrow(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    return { x1: fromX, y1: fromY, x2: toX, y2: toY };
  }

  // Normalize direction
  const nx = dx / length;
  const ny = dy / length;

  // Apply offset to start and end
  return {
    x1: fromX + nx * ARROW_OFFSET,
    y1: fromY + ny * ARROW_OFFSET,
    x2: toX - nx * ARROW_OFFSET,
    y2: toY - ny * ARROW_OFFSET,
  };
}

export function FlowOverlay(): React.ReactNode {
  const project = useProjectStore((state) => state.project);
  const showXFlow = useUIStore((state) => state.showXFlow);
  const showZFlow = useUIStore((state) => state.showZFlow);
  const resolvedFlow = useResolvedFlowStore((state) => state.resolvedFlow);
  const nodes = useNodes();
  const { x: viewportX, y: viewportY, zoom } = useViewport();

  // Get node positions from React Flow (reactive to node changes)
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    for (const node of nodes) {
      positions[node.id] = {
        x: node.position.x + 20, // Center of node (node width is 40px)
        y: node.position.y + 20, // Center of node (node height is 40px)
      };
    }
    return positions;
  }, [nodes]);

  // Generate X-Flow arrows
  const xflowArrows = useMemo<ArrowData[]>(() => {
    if (!showXFlow) return [];

    const arrows: ArrowData[] = [];
    for (const [sourceId, targets] of Object.entries(project.flow.xflow)) {
      const sourcePos = nodePositions[sourceId];
      if (sourcePos === undefined) continue;

      for (const targetId of targets) {
        const targetPos = nodePositions[targetId];
        if (targetPos === undefined) continue;

        const arrow = calculateArrow(sourcePos.x, sourcePos.y, targetPos.x, targetPos.y);
        arrows.push({
          id: `xflow-${sourceId}-${targetId}`,
          ...arrow,
        });
      }
    }
    return arrows;
  }, [showXFlow, project.flow.xflow, nodePositions]);

  // Generate Z-Flow arrows
  const zflowArrows = useMemo<ArrowData[]>(() => {
    if (!showZFlow) return [];

    // Use resolved flow if available, otherwise use manual zflow
    const zflowData =
      project.flow.zflow === "auto"
        ? (resolvedFlow?.zflow ?? {}) // Use resolved if available
        : project.flow.zflow;

    const arrows: ArrowData[] = [];
    for (const [sourceId, targets] of Object.entries(zflowData)) {
      const sourcePos = nodePositions[sourceId];
      if (sourcePos === undefined) continue;

      for (const targetId of targets) {
        const targetPos = nodePositions[targetId];
        if (targetPos === undefined) continue;

        const arrow = calculateArrow(sourcePos.x, sourcePos.y, targetPos.x, targetPos.y);
        arrows.push({
          id: `zflow-${sourceId}-${targetId}`,
          ...arrow,
        });
      }
    }
    return arrows;
  }, [showZFlow, project.flow.zflow, resolvedFlow, nodePositions]);

  // Don't render if nothing to show
  if (!showXFlow && !showZFlow) {
    return null;
  }

  if (xflowArrows.length === 0 && zflowArrows.length === 0) {
    return null;
  }

  return (
    <Panel position="top-left" className="!m-0 !p-0 pointer-events-none">
      <svg
        className="absolute top-0 left-0 overflow-visible"
        style={{
          width: 1,
          height: 1,
          transform: `translate(${viewportX}px, ${viewportY}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
        role="img"
        aria-label="Flow visualization arrows"
      >
        <title>Flow arrows</title>
        <defs>
          {/* X-Flow arrow marker (red) */}
          <marker
            id="xflow-arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
          </marker>
          {/* Z-Flow arrow marker (blue) */}
          <marker
            id="zflow-arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
          </marker>
        </defs>

        {/* X-Flow arrows (red) */}
        {xflowArrows.map((arrow) => (
          <line
            key={arrow.id}
            x1={arrow.x1}
            y1={arrow.y1}
            x2={arrow.x2}
            y2={arrow.y2}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="4 2"
            markerEnd="url(#xflow-arrowhead)"
          />
        ))}

        {/* Z-Flow arrows (blue) */}
        {zflowArrows.map((arrow) => (
          <line
            key={arrow.id}
            x1={arrow.x1}
            y1={arrow.y1}
            x2={arrow.x2}
            y2={arrow.y2}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="4 2"
            markerEnd="url(#zflow-arrowhead)"
          />
        ))}
      </svg>
    </Panel>
  );
}
