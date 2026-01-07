/**
 * Edge Utilities for Overlap Detection and Offset Calculation
 *
 * Functions for detecting parallel/overlapping edges and calculating
 * bezier curve offsets to prevent visual overlap.
 */

import type { Edge } from "@xyflow/react";

export interface EdgePosition {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

export interface EdgeWithPosition extends Edge {
  position: EdgePosition;
}

// Threshold for parallel detection (cosine of angle)
// 0.95 ≈ 18 degrees
const PARALLEL_THRESHOLD = 0.95;

// Distance threshold for overlap detection (in pixels)
const OVERLAP_DISTANCE_THRESHOLD = 50;

// Default offset multiplier between edges (in pixels)
const DEFAULT_OFFSET_MULTIPLIER = 30;

/**
 * Normalize a 2D vector
 */
function normalize(x: number, y: number): { x: number; y: number } {
  const length = Math.sqrt(x * x + y * y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  return { x: x / length, y: y / length };
}

/**
 * Calculate dot product of two 2D vectors
 */
function dot(x1: number, y1: number, x2: number, y2: number): number {
  return x1 * x2 + y1 * y2;
}

/**
 * Get direction vector of an edge (normalized)
 */
function getEdgeDirection(pos: EdgePosition): { x: number; y: number } {
  const dx = pos.targetX - pos.sourceX;
  const dy = pos.targetY - pos.sourceY;
  return normalize(dx, dy);
}

/**
 * Get midpoint of an edge
 */
function getEdgeMidpoint(pos: EdgePosition): { x: number; y: number } {
  return {
    x: (pos.sourceX + pos.targetX) / 2,
    y: (pos.sourceY + pos.targetY) / 2,
  };
}

/**
 * Calculate distance between two points
 */
function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate perpendicular distance from a point to a line segment
 */
function perpendicularDistance(
  pointX: number,
  pointY: number,
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return distance(pointX, pointY, lineStart.x, lineStart.y);
  }

  // Project point onto line
  const t = Math.max(
    0,
    Math.min(1, ((pointX - lineStart.x) * dx + (pointY - lineStart.y) * dy) / lengthSq)
  );

  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;

  return distance(pointX, pointY, projX, projY);
}

/**
 * Check if two edges are parallel (within threshold)
 */
export function areEdgesParallel(pos1: EdgePosition, pos2: EdgePosition): boolean {
  const dir1 = getEdgeDirection(pos1);
  const dir2 = getEdgeDirection(pos2);

  // Use absolute value because edges can point in opposite directions
  const dotProduct = Math.abs(dot(dir1.x, dir1.y, dir2.x, dir2.y));

  return dotProduct > PARALLEL_THRESHOLD;
}

/**
 * Check if two edges are overlapping (parallel and close together)
 */
export function areEdgesOverlapping(pos1: EdgePosition, pos2: EdgePosition): boolean {
  // First check if parallel
  if (!areEdgesParallel(pos1, pos2)) {
    return false;
  }

  // Check distance between midpoints
  const mid1 = getEdgeMidpoint(pos1);
  const mid2 = getEdgeMidpoint(pos2);
  const midDistance = distance(mid1.x, mid1.y, mid2.x, mid2.y);

  if (midDistance > OVERLAP_DISTANCE_THRESHOLD * 2) {
    return false;
  }

  // Check perpendicular distance from one edge's midpoint to the other edge
  const perpDist = perpendicularDistance(
    mid1.x,
    mid1.y,
    { x: pos2.sourceX, y: pos2.sourceY },
    { x: pos2.targetX, y: pos2.targetY }
  );

  return perpDist < OVERLAP_DISTANCE_THRESHOLD;
}

/**
 * Group overlapping edges using Union-Find algorithm
 */
export function groupOverlappingEdges(edges: readonly EdgeWithPosition[]): EdgeWithPosition[][] {
  if (edges.length === 0) {
    return [];
  }

  // Union-Find data structure
  const parent: number[] = edges.map((_, i) => i);
  const rank: number[] = edges.map(() => 0);

  function find(i: number): number {
    const p = parent[i];
    if (p === undefined) {
      return i;
    }
    if (p !== i) {
      parent[i] = find(p);
    }
    return parent[i] ?? i;
  }

  function union(i: number, j: number): void {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      const rankI = rank[rootI] ?? 0;
      const rankJ = rank[rootJ] ?? 0;
      if (rankI < rankJ) {
        parent[rootI] = rootJ;
      } else if (rankI > rankJ) {
        parent[rootJ] = rootI;
      } else {
        parent[rootJ] = rootI;
        rank[rootI] = rankI + 1;
      }
    }
  }

  // Compare all pairs of edges
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const edgeI = edges[i];
      const edgeJ = edges[j];
      if (edgeI !== undefined && edgeJ !== undefined) {
        if (areEdgesOverlapping(edgeI.position, edgeJ.position)) {
          union(i, j);
        }
      }
    }
  }

  // Group edges by their root
  const groups = new Map<number, EdgeWithPosition[]>();
  for (let i = 0; i < edges.length; i++) {
    const root = find(i);
    const edge = edges[i];
    if (edge !== undefined) {
      const group = groups.get(root) ?? [];
      group.push(edge);
      groups.set(root, group);
    }
  }

  return Array.from(groups.values());
}

/**
 * Check if two edges point in the same direction (not antiparallel)
 * Returns true if same direction, false if opposite direction
 */
function isSameDirection(pos1: EdgePosition, pos2: EdgePosition): boolean {
  const dir1 = getEdgeDirection(pos1);
  const dir2 = getEdgeDirection(pos2);
  // Positive dot product means same direction, negative means opposite
  return dot(dir1.x, dir1.y, dir2.x, dir2.y) >= 0;
}

/**
 * Calculate offset values for all edges based on overlap groups
 *
 * For antiparallel edges (same line but opposite directions), the offset sign
 * is flipped to ensure they separate on opposite sides of the line.
 */
export function calculateEdgeOffsets(
  edges: readonly EdgeWithPosition[],
  offsetMultiplier: number = DEFAULT_OFFSET_MULTIPLIER
): Map<string, number> {
  const offsets = new Map<string, number>();

  // Initialize all edges with zero offset
  for (const edge of edges) {
    offsets.set(edge.id, 0);
  }

  // Group overlapping edges
  const groups = groupOverlappingEdges(edges);

  // Calculate offsets for each group
  for (const group of groups) {
    if (group.length <= 1) {
      continue; // No offset needed for single edges
    }

    // Sort by edge ID for consistent ordering
    group.sort((a, b) => a.id.localeCompare(b.id));

    // Use the first edge as the reference direction
    const referenceEdge = group[0];
    if (referenceEdge === undefined) {
      continue;
    }

    // Assign offsets centered around zero, flipping sign for antiparallel edges
    for (let i = 0; i < group.length; i++) {
      const edge = group[i];
      if (edge !== undefined) {
        const baseOffset = (i - (group.length - 1) / 2) * offsetMultiplier;
        // Flip offset sign if edge points in opposite direction to reference
        const directionMultiplier = isSameDirection(referenceEdge.position, edge.position) ? 1 : -1;
        offsets.set(edge.id, baseOffset * directionMultiplier);
      }
    }
  }

  return offsets;
}

/**
 * Generate SVG path for quadratic bezier curve with perpendicular offset
 *
 * @param sourceX - Source X coordinate
 * @param sourceY - Source Y coordinate
 * @param targetX - Target X coordinate
 * @param targetY - Target Y coordinate
 * @param offset - Perpendicular offset (positive = right side when looking from source to target)
 * @returns Tuple of [SVG path string, label X position, label Y position]
 */
export function getOffsetBezierPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  offset: number
): [path: string, labelX: number, labelY: number] {
  // Midpoint of the edge
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  if (offset === 0) {
    // No offset - return straight line
    return [`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`, midX, midY];
  }

  // Direction vector
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    return [`M ${sourceX} ${sourceY}`, sourceX, sourceY];
  }

  // Perpendicular unit vector (rotated 90 degrees clockwise)
  const perpX = -dy / length;
  const perpY = dx / length;

  // Control point offset from midpoint
  const controlX = midX + perpX * offset;
  const controlY = midY + perpY * offset;

  // For quadratic bezier, the curve apex is at 0.5 of offset at t=0.5
  // Label position is at the apex
  const labelX = midX + perpX * offset * 0.5;
  const labelY = midY + perpY * offset * 0.5;

  return [
    `M ${sourceX} ${sourceY} Q ${controlX} ${controlY} ${targetX} ${targetY}`,
    labelX,
    labelY,
  ];
}
