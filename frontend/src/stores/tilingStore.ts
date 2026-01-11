/**
 * Tiling Store
 *
 * State management for tiling feature.
 * Handles pattern selection, cell range, preview generation, and applying to project.
 */

import { MAX_RECOMMENDED_NODES, estimateNodeCount, generateTiling } from "@/lib/tiling/generator";
import { TILING_PRESETS_2D, getPresetById } from "@/lib/tiling/presets";
import { validateTilingGeneration } from "@/lib/tiling/validation";
import type { Coordinate, GraphEdge, GraphNode, IntermediateNode } from "@/types";
import { normalizeEdgeId } from "@/types";
import type { CellRange, GeneratedGraph, TilingPattern } from "@/types/tiling";
import { create } from "zustand";
import { useProjectStore } from "./projectStore";

/**
 * Error state for tiling operations.
 */
interface TilingError {
  code: string;
  message: string;
}

/**
 * Tiling store state.
 */
interface TilingState {
  // Selected pattern
  selectedPatternId: string | null;
  pattern: TilingPattern | null;

  // Drag state
  isDragging: boolean;
  dragStart: Coordinate | null;
  dragEnd: Coordinate | null;

  // Generated preview
  cellRange: CellRange | null;
  previewGraph: GeneratedGraph | null;

  // Error state
  error: TilingError | null;

  // Actions
  selectPattern: (id: string) => void;
  clearPattern: () => void;
  startDrag: (coord: Coordinate) => void;
  updateDrag: (coord: Coordinate) => void;
  endDrag: () => void;
  cancelDrag: () => void;
  applyTiling: () => void;
  clearPreview: () => void;
  reset: () => void;
}

/**
 * Convert GeneratedNode to GraphNode (IntermediateNode).
 */
function toGraphNode(
  id: string,
  position: [number, number, number],
  role: "input" | "output" | "intermediate"
): GraphNode {
  const coordinate: Coordinate = {
    x: position[0],
    y: position[1],
    z: position[2],
  };

  if (role === "input") {
    // Input nodes need qubitIndex - use 0 as placeholder
    // In real usage, users would set this manually
    return {
      id,
      coordinate,
      role: "input",
      measBasis: { type: "planner", plane: "XY", angleCoeff: 0 },
      qubitIndex: 0,
    };
  }

  if (role === "output") {
    return {
      id,
      coordinate,
      role: "output",
      qubitIndex: 0,
    };
  }

  // Default: intermediate node
  const node: IntermediateNode = {
    id,
    coordinate,
    role: "intermediate",
    measBasis: { type: "planner", plane: "XY", angleCoeff: 0 },
  };
  return node;
}

/**
 * Convert GeneratedEdge to GraphEdge.
 */
function toGraphEdge(source: string, target: string): GraphEdge {
  return {
    id: normalizeEdgeId(source, target),
    source,
    target,
  };
}

/**
 * Compute cell range from drag coordinates.
 */
function computeCellRange(start: Coordinate, end: Coordinate, pattern: TilingPattern): CellRange {
  const { a1, a2, a3 } = pattern.latticeVectors;

  // Use the primary component of each lattice vector as cell size
  const cellSizeX = Math.abs(a1[0]) || 1;
  const cellSizeY = Math.abs(a2[1]) || 1;
  const cellSizeZ = a3 !== undefined ? Math.abs(a3[2]) || 1 : 1;

  // Compute cell coordinates for start and end points
  const startCx = Math.floor(start.x / cellSizeX);
  const startCy = Math.floor(start.y / cellSizeY);
  const startCz = Math.floor(start.z / cellSizeZ);

  const endCx = Math.floor(end.x / cellSizeX);
  const endCy = Math.floor(end.y / cellSizeY);
  const endCz = Math.floor(end.z / cellSizeZ);

  // Ensure min <= max
  const xMin = Math.min(startCx, endCx);
  const xMax = Math.max(startCx, endCx);
  const yMin = Math.min(startCy, endCy);
  const yMax = Math.max(startCy, endCy);
  const zMin = Math.min(startCz, endCz);
  const zMax = Math.max(startCz, endCz);

  const range: CellRange = {
    x: [xMin, xMax],
    y: [yMin, yMax],
  };

  if (pattern.dimension === 3) {
    range.z = [zMin, zMax];
  }

  return range;
}

export const useTilingStore = create<TilingState>((set, get) => ({
  selectedPatternId: null,
  pattern: null,
  isDragging: false,
  dragStart: null,
  dragEnd: null,
  cellRange: null,
  previewGraph: null,
  error: null,

  selectPattern: (id: string): void => {
    const pattern = getPresetById(id);
    if (pattern === undefined) {
      set({
        error: { code: "PATTERN_NOT_FOUND", message: `Pattern "${id}" not found` },
      });
      return;
    }
    set({
      selectedPatternId: id,
      pattern,
      error: null,
      // Clear any existing preview when switching patterns
      cellRange: null,
      previewGraph: null,
      isDragging: false,
      dragStart: null,
      dragEnd: null,
    });
  },

  clearPattern: (): void => {
    set({
      selectedPatternId: null,
      pattern: null,
      cellRange: null,
      previewGraph: null,
      error: null,
      isDragging: false,
      dragStart: null,
      dragEnd: null,
    });
  },

  startDrag: (coord: Coordinate): void => {
    const { pattern } = get();
    if (pattern === null) {
      set({
        error: { code: "NO_PATTERN", message: "No pattern selected" },
      });
      return;
    }
    set({
      isDragging: true,
      dragStart: coord,
      dragEnd: coord,
      cellRange: null,
      previewGraph: null,
      error: null,
    });
  },

  updateDrag: (coord: Coordinate): void => {
    const { isDragging, dragStart, pattern } = get();
    if (!isDragging || dragStart === null || pattern === null) {
      return;
    }

    // Compute cell range
    const cellRange = computeCellRange(dragStart, coord, pattern);

    // Check if node count is reasonable
    const nodeCount = estimateNodeCount(pattern, cellRange);
    if (nodeCount > MAX_RECOMMENDED_NODES) {
      set({
        dragEnd: coord,
        cellRange,
        previewGraph: null,
        error: {
          code: "TOO_MANY_NODES",
          message: `Too many nodes: ${nodeCount} (max ${MAX_RECOMMENDED_NODES})`,
        },
      });
      return;
    }

    // Generate preview
    try {
      const previewGraph = generateTiling(pattern, cellRange);
      set({
        dragEnd: coord,
        cellRange,
        previewGraph,
        error: null,
      });
    } catch (err) {
      set({
        dragEnd: coord,
        cellRange,
        previewGraph: null,
        error: {
          code: "GENERATION_ERROR",
          message: err instanceof Error ? err.message : "Unknown error",
        },
      });
    }
  },

  endDrag: (): void => {
    const { isDragging } = get();
    if (!isDragging) return;

    set({
      isDragging: false,
    });
    // Keep dragStart, dragEnd, cellRange, and previewGraph for Apply/Cancel
  },

  cancelDrag: (): void => {
    set({
      isDragging: false,
      dragStart: null,
      dragEnd: null,
      cellRange: null,
      previewGraph: null,
      error: null,
    });
  },

  applyTiling: (): void => {
    const { pattern, cellRange, previewGraph } = get();

    if (pattern === null || cellRange === null || previewGraph === null) {
      set({
        error: { code: "NO_PREVIEW", message: "No preview to apply" },
      });
      return;
    }

    // Validate before applying
    const validation = validateTilingGeneration(pattern, cellRange, {
      require2D: pattern.dimension === 2,
      require3D: pattern.dimension === 3,
      maxNodes: MAX_RECOMMENDED_NODES,
    });

    if (!validation.valid) {
      set({
        error: { code: "VALIDATION_ERROR", message: validation.error ?? "Validation failed" },
      });
      return;
    }

    // Get project store actions
    const { addNode, addEdge } = useProjectStore.getState();

    // Add all nodes
    for (const node of previewGraph.nodes) {
      const graphNode = toGraphNode(node.id, node.position, node.role);
      addNode(graphNode);
    }

    // Add all edges
    for (const edge of previewGraph.edges) {
      const graphEdge = toGraphEdge(edge.source, edge.target);
      addEdge(graphEdge);
    }

    // Clear tiling state
    set({
      isDragging: false,
      dragStart: null,
      dragEnd: null,
      cellRange: null,
      previewGraph: null,
      error: null,
    });
  },

  clearPreview: (): void => {
    set({
      isDragging: false,
      dragStart: null,
      dragEnd: null,
      cellRange: null,
      previewGraph: null,
      error: null,
    });
  },

  reset: (): void => {
    set({
      selectedPatternId: null,
      pattern: null,
      isDragging: false,
      dragStart: null,
      dragEnd: null,
      cellRange: null,
      previewGraph: null,
      error: null,
    });
  },
}));

/**
 * Get available 2D presets for the UI.
 */
export function getAvailable2DPresets(): TilingPattern[] {
  return TILING_PRESETS_2D;
}
