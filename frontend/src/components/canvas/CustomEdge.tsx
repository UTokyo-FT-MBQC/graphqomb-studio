/**
 * Custom Edge Component
 *
 * Renders edges with bezier curves and automatic offset
 * to prevent overlapping when parallel edges are close together.
 * Supports schedule editor highlight integration.
 */

"use client";

import { getOffsetBezierPath } from "@/lib/edgeUtils";
import { useScheduleEditorStore } from "@/stores/scheduleEditorStore";
import type { EdgeProps } from "@xyflow/react";
import type { CSSProperties } from "react";
import { memo } from "react";

export interface CustomEdgeData {
  offset?: number;
  sourceCenter?: { x: number; y: number };
  targetCenter?: { x: number; y: number };
}

function CustomEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
  style,
}: EdgeProps): React.ReactNode {
  const edgeData = data as CustomEdgeData | undefined;
  const offset = edgeData?.offset ?? 0;

  // Schedule editor highlight state
  const hoveredEdgeId = useScheduleEditorStore((s) => s.hoveredEdgeId);
  const selectedEdgeEntryId = useScheduleEditorStore((s) => s.selectedEdgeEntryId);
  const isEditorOpen = useScheduleEditorStore((s) => s.isEditorOpen);

  const isScheduleHighlighted =
    isEditorOpen && (hoveredEdgeId === id || selectedEdgeEntryId === id);

  const [edgePath] = getOffsetBezierPath(sourceX, sourceY, targetX, targetY, offset);

  // Determine stroke color and width based on state
  let strokeColor = "#6b7280"; // Default gray
  let strokeWidth = 2;

  if (isScheduleHighlighted) {
    strokeColor = "#f97316"; // Orange for schedule highlight
    strokeWidth = 3;
  } else if (selected === true) {
    strokeColor = "#3b82f6"; // Blue for selection
    strokeWidth = 2;
  }

  const combinedStyle: CSSProperties = {
    ...(style ?? {}),
    stroke: strokeColor,
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const haloStyle: CSSProperties = {
    ...(style ?? {}),
    stroke: strokeColor,
    strokeWidth: strokeWidth + 5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    opacity: isScheduleHighlighted || selected === true ? 0.24 : 0.14,
    pointerEvents: "none",
  };

  return (
    <g>
      <path d={edgePath} fill="none" style={haloStyle} />
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        style={combinedStyle}
      />
    </g>
  );
}

export const CustomEdge = memo(CustomEdgeComponent);
