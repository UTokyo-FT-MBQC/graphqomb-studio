import type {
  CellRange,
  GeneratedEdge,
  GeneratedGraph,
  GeneratedNode,
  TilingPattern,
} from "@/types/tiling";

/**
 * Generate a global node ID from world position coordinates.
 * Format: `${x}_${y}_${z}` (e.g., "0_0_0", "1.5_0_0")
 *
 * The position is the computed world coordinate of the node,
 * which is unique for each node in the graph.
 */
export function generateGlobalNodeId(position: [number, number, number]): string {
  return `${position[0]}_${position[1]}_${position[2]}`;
}

/**
 * Normalize an edge ID so that source < target (lexicographic order).
 * This ensures undirected edges are represented consistently.
 */
export function normalizeEdgeKey(source: string, target: string): string {
  const [a, b] = source < target ? [source, target] : [target, source];
  return `${a}--${b}`;
}

/**
 * Check if a cell coordinate is within the given range.
 */
function isCellInRange(
  cx: number,
  cy: number,
  cz: number,
  range: CellRange,
  is3D: boolean
): boolean {
  if (cx < range.x[0] || cx > range.x[1]) return false;
  if (cy < range.y[0] || cy > range.y[1]) return false;
  if (is3D && range.z !== undefined) {
    if (cz < range.z[0] || cz > range.z[1]) return false;
  }
  return true;
}

/**
 * Compute the world position of a node given cell coordinates and node offset.
 * position = cx*a1 + cy*a2 + cz*a3 + offset
 */
function computeNodePosition(
  pattern: TilingPattern,
  cx: number,
  cy: number,
  cz: number,
  offset: [number, number, number]
): [number, number, number] {
  const { a1, a2, a3 } = pattern.latticeVectors;

  let x = cx * a1[0] + cy * a2[0] + offset[0];
  let y = cx * a1[1] + cy * a2[1] + offset[1];
  let z = cx * a1[2] + cy * a2[2] + offset[2];

  if (a3 !== undefined) {
    x += cz * a3[0];
    y += cz * a3[1];
    z += cz * a3[2];
  }

  // Round to 2 decimal places for consistency
  x = Math.round(x * 100) / 100;
  y = Math.round(y * 100) / 100;
  z = Math.round(z * 100) / 100;

  return [x, y, z];
}

/**
 * Options for tiling generation.
 */
export interface GenerateTilingOptions {
  /**
   * Base Z position for 2D patterns.
   * When placing a 2D pattern at a specific Z slice, this value is added to all node Z coordinates.
   * Default: 0
   */
  baseZ?: number;
}

/**
 * Generate nodes and edges from a tiling pattern within the given cell range.
 *
 * @param pattern - The tiling pattern to generate
 * @param cellRange - The cell range to generate within
 * @param options - Optional generation options (e.g., baseZ for 2D patterns)
 */
export function generateTiling(
  pattern: TilingPattern,
  cellRange: CellRange,
  options: GenerateTilingOptions = {}
): GeneratedGraph {
  const nodes: GeneratedNode[] = [];
  const edges: GeneratedEdge[] = [];
  const edgeSet = new Set<string>();

  const is3D = pattern.dimension === 3;
  const baseZ = options.baseZ ?? 0;

  // For 3D patterns, use cellRange.z; for 2D patterns, use baseZ for all nodes
  const zMin = is3D && cellRange.z !== undefined ? cellRange.z[0] : 0;
  const zMax = is3D && cellRange.z !== undefined ? cellRange.z[1] : 0;

  // Generate nodes for each cell in range
  for (let cx = cellRange.x[0]; cx <= cellRange.x[1]; cx++) {
    for (let cy = cellRange.y[0]; cy <= cellRange.y[1]; cy++) {
      for (let cz = zMin; cz <= zMax; cz++) {
        for (const unitNode of pattern.unitCell.nodes) {
          const position = computeNodePosition(pattern, cx, cy, cz, unitNode.offset);

          // For 2D patterns, set Z to baseZ
          if (!is3D) {
            position[2] = baseZ;
          }

          const globalId = generateGlobalNodeId(position);
          const role = unitNode.role ?? "intermediate";

          nodes.push({
            id: globalId,
            position,
            role,
          });
        }
      }
    }
  }

  // Generate edges for each cell in range
  for (let cx = cellRange.x[0]; cx <= cellRange.x[1]; cx++) {
    for (let cy = cellRange.y[0]; cy <= cellRange.y[1]; cy++) {
      for (let cz = zMin; cz <= zMax; cz++) {
        for (const unitEdge of pattern.unitCell.edges) {
          const cellOffset = unitEdge.cellOffset ?? [0, 0, 0];
          const targetCx = cx + cellOffset[0];
          const targetCy = cy + cellOffset[1];
          const targetCz = cz + cellOffset[2];

          // Skip if target cell is out of range
          if (!isCellInRange(targetCx, targetCy, targetCz, cellRange, is3D)) {
            continue;
          }

          // Find the source node offset from unit cell
          const sourceUnitNode = pattern.unitCell.nodes.find((n) => n.id === unitEdge.source);
          const targetUnitNode = pattern.unitCell.nodes.find((n) => n.id === unitEdge.target);
          if (sourceUnitNode === undefined || targetUnitNode === undefined) {
            continue;
          }

          // Compute source and target positions
          const sourcePos = computeNodePosition(pattern, cx, cy, cz, sourceUnitNode.offset);
          const targetPos = computeNodePosition(
            pattern,
            targetCx,
            targetCy,
            targetCz,
            targetUnitNode.offset
          );

          // For 2D patterns, set Z to baseZ
          if (!is3D) {
            sourcePos[2] = baseZ;
            targetPos[2] = baseZ;
          }

          const sourceId = generateGlobalNodeId(sourcePos);
          const targetId = generateGlobalNodeId(targetPos);

          // Skip self-loops (should not happen with valid patterns, but safety check)
          if (sourceId === targetId) {
            continue;
          }

          // Normalize edge key for duplicate detection
          const edgeKey = normalizeEdgeKey(sourceId, targetId);

          // Skip if edge already exists
          if (edgeSet.has(edgeKey)) {
            continue;
          }

          edgeSet.add(edgeKey);

          // Store edge with normalized source/target order
          const [normalizedSource, normalizedTarget] =
            sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];

          edges.push({
            id: edgeKey,
            source: normalizedSource,
            target: normalizedTarget,
          });
        }
      }
    }
  }

  return { nodes, edges };
}

/**
 * Compute cell range from two graph coordinates (drag start and end).
 * This uses a simple axis-aligned approach for now.
 */
export function computeCellRangeFromCoordinates(
  startX: number,
  startY: number,
  startZ: number,
  endX: number,
  endY: number,
  endZ: number,
  pattern: TilingPattern
): CellRange {
  // For simplicity, use axis-aligned cell range based on a1[0], a2[1], a3[2] as cell sizes
  // This works well for orthogonal lattice vectors
  const { a1, a2, a3 } = pattern.latticeVectors;

  // Use the primary component of each lattice vector as cell size
  const cellSizeX = Math.abs(a1[0]) || 1;
  const cellSizeY = Math.abs(a2[1]) || 1;
  const cellSizeZ = a3 !== undefined ? Math.abs(a3[2]) || 1 : 1;

  // Compute cell coordinates for start and end points
  const startCx = Math.floor(startX / cellSizeX);
  const startCy = Math.floor(startY / cellSizeY);
  const startCz = Math.floor(startZ / cellSizeZ);

  const endCx = Math.floor(endX / cellSizeX);
  const endCy = Math.floor(endY / cellSizeY);
  const endCz = Math.floor(endZ / cellSizeZ);

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

/**
 * Estimate the number of nodes that would be generated for a given cell range.
 * Useful for performance warnings.
 */
export function estimateNodeCount(pattern: TilingPattern, cellRange: CellRange): number {
  const xCount = cellRange.x[1] - cellRange.x[0] + 1;
  const yCount = cellRange.y[1] - cellRange.y[0] + 1;
  const zCount =
    pattern.dimension === 3 && cellRange.z !== undefined ? cellRange.z[1] - cellRange.z[0] + 1 : 1;

  return xCount * yCount * zCount * pattern.unitCell.nodes.length;
}

/**
 * Maximum recommended node count before showing a warning.
 */
export const MAX_RECOMMENDED_NODES = 1000;
