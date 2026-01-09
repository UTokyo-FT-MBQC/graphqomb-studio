/**
 * Geometry Utilities for 3D Support
 *
 * Functions for calculating ghost node positions, Z-slice filtering,
 * and coordinate transformations.
 */

import type { Coordinate, GraphNode } from "@/types";
import { is3D } from "@/types";

// Micro-shift offset for overlapping XY coordinates
export const GHOST_OFFSET = 0.15;

// Canvas scale factor (pixels per unit)
export const SCALE = 100;

/**
 * Get the Z coordinate of a node, defaulting to 0 for 2D nodes
 */
export function getNodeZ(node: GraphNode): number {
  return is3D(node.coordinate) ? node.coordinate.z : 0;
}

/**
 * Get all nodes at a specific Z level
 */
export function getNodesAtZ(nodes: readonly GraphNode[], z: number): GraphNode[] {
  return nodes.filter((node) => getNodeZ(node) === z);
}

/**
 * Get nodes from adjacent Z levels (z-1 and z+1)
 */
export function getAdjacentZNodes(
  nodes: readonly GraphNode[],
  currentZ: number
): { above: GraphNode[]; below: GraphNode[] } {
  const above: GraphNode[] = [];
  const below: GraphNode[] = [];

  for (const node of nodes) {
    const nodeZ = getNodeZ(node);
    if (nodeZ === currentZ + 1) {
      above.push(node);
    } else if (nodeZ === currentZ - 1) {
      below.push(node);
    }
  }

  return { above, below };
}

/**
 * Get the value of a specific axis from a node's coordinate
 */
function getNodeAxisValue(node: GraphNode, axis: "x" | "y" | "z"): number {
  if (axis === "z") {
    return is3D(node.coordinate) ? node.coordinate.z : 0;
  }
  return node.coordinate[axis];
}

/**
 * Get the range (min and max) of a specific axis from all nodes
 */
export function getAxisRange(
  nodes: readonly GraphNode[],
  axis: "x" | "y" | "z"
): { min: number; max: number } {
  if (nodes.length === 0) {
    return { min: 0, max: 0 };
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    const value = getNodeAxisValue(node, axis);
    if (value < min) min = value;
    if (value > max) max = value;
  }

  return { min, max };
}

/**
 * Get the Z range (min and max) from all nodes
 */
export function getZRange(nodes: readonly GraphNode[]): { min: number; max: number } {
  return getAxisRange(nodes, "z");
}

/**
 * Check if a node's XY position overlaps with any node on the current Z slice
 */
export function hasOverlappingXY(node: GraphNode, currentZNodes: readonly GraphNode[]): boolean {
  const { x, y } = node.coordinate;

  return currentZNodes.some(
    (other) => other.id !== node.id && other.coordinate.x === x && other.coordinate.y === y
  );
}

/**
 * Calculate the ghost node position with micro-shift if needed
 *
 * @param node - The node to get ghost position for
 * @param currentZ - The current Z slice being viewed
 * @param allNodes - All nodes in the project
 * @returns Position in graph coordinates (not screen pixels), or null if not a ghost node
 */
export function getGhostPosition(
  node: GraphNode,
  currentZ: number,
  allNodes: readonly GraphNode[]
): { x: number; y: number } | null {
  const nodeZ = getNodeZ(node);

  // Not a ghost node if on current Z
  if (nodeZ === currentZ) {
    return null;
  }

  // Only show ghosts from adjacent Z levels
  if (Math.abs(nodeZ - currentZ) !== 1) {
    return null;
  }

  const baseX = node.coordinate.x;
  const baseY = node.coordinate.y;

  // Check for overlapping XY with nodes on current Z
  const currentZNodes = getNodesAtZ(allNodes, currentZ);
  const hasOverlap = hasOverlappingXY(node, currentZNodes);

  if (hasOverlap) {
    // Apply micro-shift based on Z direction
    const zDiff = nodeZ - currentZ;
    const offset = GHOST_OFFSET * Math.sign(zDiff);
    return { x: baseX + offset, y: baseY + offset };
  }

  return { x: baseX, y: baseY };
}

/**
 * Convert graph coordinates to screen position
 */
export function toScreenPosition(coord: Coordinate): { x: number; y: number } {
  return {
    x: coord.x * SCALE,
    y: coord.y * SCALE,
  };
}

/**
 * Convert screen position to graph coordinates
 */
export function toGraphCoordinate(
  screenX: number,
  screenY: number,
  is3DMode: boolean,
  z: number
): Coordinate {
  const x = Math.round((screenX / SCALE) * 100) / 100;
  const y = Math.round((screenY / SCALE) * 100) / 100;

  if (is3DMode) {
    return { x, y, z };
  }

  return { x, y };
}
