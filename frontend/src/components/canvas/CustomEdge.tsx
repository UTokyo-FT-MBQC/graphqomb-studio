/**
 * Custom Edge Component
 *
 * Renders edges with consistent styling.
 */

"use client";

import { BaseEdge, getStraightPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import { memo } from "react";

function CustomEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
}: EdgeProps): React.ReactNode {
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: selected ? "#3b82f6" : "#6b7280",
        strokeWidth: selected ? 2 : 1.5,
      }}
    />
  );
}

export const CustomEdge = memo(CustomEdgeComponent);
