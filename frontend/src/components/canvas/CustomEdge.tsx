/**
 * Custom Edge Component
 *
 * Renders edges with bezier curves and automatic offset
 * to prevent overlapping when parallel edges are close together.
 */

"use client";

import { getOffsetBezierPath } from "@/lib/edgeUtils";
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

  const [edgePath] = getOffsetBezierPath(sourceX, sourceY, targetX, targetY, offset);

  const combinedStyle: CSSProperties = {
    stroke: selected === true ? "#3b82f6" : "#6b7280",
    strokeWidth: selected === true ? 2 : 1.5,
    ...(style ?? {}),
  };

  return <BaseEdge id={id} path={edgePath} style={combinedStyle} />;
}

export const CustomEdge = memo(CustomEdgeComponent);
