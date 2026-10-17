/**
 * Flow Overlay
 *
 * Renders flow arrows (X-Flow, Z-Flow, and C-Flow) as SVG overlay on the canvas.
 * - X-Flow: Red arrows
 * - Z-Flow: Blue arrows
 * - C-Flow: Purple arrows with correcting gate labels
 *
 * Uses React Flow's Panel component for proper positioning with pan/zoom.
 */

"use client";

import { Panel, useNodes, useViewport } from "@xyflow/react";
import { useMemo } from "react";
import { useResolvedFlow } from "@/hooks/useResolvedFlow";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";

// Arrow offset from node center (to avoid overlapping with node)
const ARROW_OFFSET = 20;

// Self-loop configuration
const SELF_LOOP_RADIUS = 20;
const SELF_LOOP_OFFSET = 15; // Offset from node center

interface ArrowData {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface SelfLoopData {
  id: string;
  cx: number; // Node center x
  cy: number; // Node center y
  path: string; // SVG path for the loop
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

  // Handle overlapping nodes (different nodes at same position)
  // Draw a very short arrow pointing right
  if (length === 0) {
    return {
      x1: fromX + ARROW_OFFSET,
      y1: fromY,
      x2: fromX + ARROW_OFFSET + 1,
      y2: fromY,
    };
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

// Calculate self-loop path (loop at top-right of node)
function calculateSelfLoopPath(cx: number, cy: number): string {
  // Start point: right side of node
  const startX = cx + SELF_LOOP_OFFSET;
  const startY = cy;

  // Control points for a smooth loop going up and around
  const r = SELF_LOOP_RADIUS;

  // Create a loop path using cubic bezier curves
  // The loop goes: right -> up-right -> up -> up-left -> left -> back to start area
  return `M ${startX} ${startY}
          C ${startX + r} ${startY - r * 0.5},
            ${startX + r} ${startY - r * 1.5},
            ${cx} ${cy - SELF_LOOP_OFFSET - r}
          C ${cx - r} ${cy - SELF_LOOP_OFFSET - r},
            ${cx - SELF_LOOP_OFFSET - r * 0.5} ${cy - r * 0.5},
            ${cx - SELF_LOOP_OFFSET} ${cy}`;
}

export function FlowOverlay(): React.ReactNode {
  const project = useProjectStore((state) => state.project);
  const showXFlow = useUIStore((state) => state.showXFlow);
  const showCFlow = useUIStore((state) => state.showCFlow);
  const showZFlow = useUIStore((state) => state.showZFlow);
  const { resolvedFlow } = useResolvedFlow(showZFlow);
  const nodes = useNodes();
  const { x: viewportX, y: viewportY, zoom } = useViewport();

  // Get node positions from React Flow (reactive to node changes)
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    for (const node of nodes) {
      positions[node.id] = {
        x: node.position.x,
        y: node.position.y,
      };
    }
    return positions;
  }, [nodes]);

  // Generate X-Flow arrows and self-loops
  const { xflowArrows, xflowSelfLoops } = useMemo<{
    xflowArrows: ArrowData[];
    xflowSelfLoops: SelfLoopData[];
  }>(() => {
    if (!showXFlow) return { xflowArrows: [], xflowSelfLoops: [] };

    const arrows: ArrowData[] = [];
    const selfLoops: SelfLoopData[] = [];

    for (const [sourceId, targets] of Object.entries(project.flow.xflow)) {
      const sourcePos = nodePositions[sourceId];
      if (sourcePos === undefined) continue;

      for (const targetId of targets) {
        const targetPos = nodePositions[targetId];
        if (targetPos === undefined) continue;

        // Detect self-loop by node ID, not by position
        if (sourceId === targetId) {
          selfLoops.push({
            id: `xflow-${sourceId}-${targetId}`,
            cx: sourcePos.x,
            cy: sourcePos.y,
            path: calculateSelfLoopPath(sourcePos.x, sourcePos.y),
          });
        } else {
          const arrow = calculateArrow(sourcePos.x, sourcePos.y, targetPos.x, targetPos.y);
          arrows.push({
            id: `xflow-${sourceId}-${targetId}`,
            ...arrow,
          });
        }
      }
    }
    return { xflowArrows: arrows, xflowSelfLoops: selfLoops };
  }, [showXFlow, project.flow.xflow, nodePositions]);

  // Generate Z-Flow arrows and self-loops
  const { zflowArrows, zflowSelfLoops } = useMemo<{
    zflowArrows: ArrowData[];
    zflowSelfLoops: SelfLoopData[];
  }>(() => {
    if (!showZFlow) return { zflowArrows: [], zflowSelfLoops: [] };

    // Use resolved flow if available, otherwise use manual zflow
    const zflowData =
      project.flow.zflow === "auto"
        ? (resolvedFlow?.zflow ?? {}) // Use resolved if available
        : project.flow.zflow;

    const arrows: ArrowData[] = [];
    const selfLoops: SelfLoopData[] = [];

    for (const [sourceId, targets] of Object.entries(zflowData)) {
      const sourcePos = nodePositions[sourceId];
      if (sourcePos === undefined) continue;

      for (const targetId of targets) {
        const targetPos = nodePositions[targetId];
        if (targetPos === undefined) continue;

        // Detect self-loop by node ID, not by position
        if (sourceId === targetId) {
          selfLoops.push({
            id: `zflow-${sourceId}-${targetId}`,
            cx: sourcePos.x,
            cy: sourcePos.y,
            path: calculateSelfLoopPath(sourcePos.x, sourcePos.y),
          });
        } else {
          const arrow = calculateArrow(sourcePos.x, sourcePos.y, targetPos.x, targetPos.y);
          arrows.push({
            id: `zflow-${sourceId}-${targetId}`,
            ...arrow,
          });
        }
      }
    }
    return { zflowArrows: arrows, zflowSelfLoops: selfLoops };
  }, [showZFlow, project.flow.zflow, resolvedFlow, nodePositions]);

  const cflowArrows = useMemo(() => {
    if (!showCFlow) return [];
    return Object.entries(project.flow.cflow ?? {}).flatMap(([source, targets]) => {
      const from = nodePositions[source];
      if (from === undefined) return [];
      return Object.entries(targets).flatMap(([target, gate]) => {
        const to = nodePositions[target];
        if (to === undefined) return [];
        if (source === target) {
          return [
            {
              id: `cflow-${source}-${target}`,
              gate,
              source,
              target,
              path: calculateSelfLoopPath(from.x, from.y),
              labelX: from.x,
              labelY: from.y - 45,
            },
          ];
        }
        const arrow = calculateArrow(from.x, from.y, to.x, to.y);
        const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
        const offsetX = (-(to.y - from.y) / length) * 18;
        const offsetY = ((to.x - from.x) / length) * 18;
        const midX = (arrow.x1 + arrow.x2) / 2;
        const midY = (arrow.y1 + arrow.y2) / 2;
        return [
          {
            id: `cflow-${source}-${target}`,
            gate,
            source,
            target,
            path: `M ${arrow.x1} ${arrow.y1} Q ${midX + offsetX} ${midY + offsetY} ${arrow.x2} ${arrow.y2}`,
            labelX: midX + offsetX / 2,
            labelY: midY + offsetY / 2 - 5,
          },
        ];
      });
    });
  }, [showCFlow, project.flow.cflow, nodePositions]);

  // Don't render if nothing to show
  if (!showXFlow && !showZFlow && !showCFlow) {
    return null;
  }

  const hasXFlow = xflowArrows.length > 0 || xflowSelfLoops.length > 0;
  const hasZFlow = zflowArrows.length > 0 || zflowSelfLoops.length > 0;

  if (!hasXFlow && !hasZFlow && cflowArrows.length === 0) {
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
          <marker
            id="cflow-arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
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

        {/* X-Flow self-loops (red) */}
        {xflowSelfLoops.map((loop) => (
          <path
            key={loop.id}
            d={loop.path}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="4 2"
            fill="none"
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

        {/* Z-Flow self-loops (blue) */}
        {zflowSelfLoops.map((loop) => (
          <path
            key={loop.id}
            d={loop.path}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="4 2"
            fill="none"
            markerEnd="url(#zflow-arrowhead)"
          />
        ))}
        {cflowArrows.map((arrow) => (
          <g key={arrow.id} aria-label={`C-Flow ${arrow.source} to ${arrow.target}: ${arrow.gate}`}>
            <title>{`${arrow.source} → ${arrow.target}: ${arrow.gate}`}</title>
            <path
              d={arrow.path}
              fill="none"
              stroke="#a855f7"
              strokeWidth={2}
              strokeDasharray="4 2"
              markerEnd="url(#cflow-arrowhead)"
            />
            <text
              x={arrow.labelX}
              y={arrow.labelY}
              textAnchor="middle"
              fontSize={12}
              fill="#9333ea"
              stroke="white"
              strokeWidth={3}
              paintOrder="stroke"
            >
              {arrow.gate}
            </text>
          </g>
        ))}
      </svg>
    </Panel>
  );
}
