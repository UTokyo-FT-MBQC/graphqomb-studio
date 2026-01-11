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
import { BaseEdge } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import type { CSSProperties } from "react";
import { memo } from "react";

export interface CustomEdgeData {
  offset?: number;
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
  let strokeWidth = 1.5;

  if (isScheduleHighlighted) {
    strokeColor = "#f97316"; // Orange for schedule highlight
    strokeWidth = 3;
  } else if (selected === true) {
    strokeColor = "#3b82f6"; // Blue for selection
    strokeWidth = 2;
  }

  const combinedStyle: CSSProperties = {
    stroke: strokeColor,
    strokeWidth,
    ...(style ?? {}),
  };

  return <BaseEdge id={id} path={edgePath} style={combinedStyle} />;
}

export const CustomEdge = memo(CustomEdgeComponent);
