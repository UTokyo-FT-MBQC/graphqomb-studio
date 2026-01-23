/**
 * RHG (Raussendorf-Harrington-Goyal) Lattice Generator
 *
 * Generates RHG lattice for fault-tolerant MBQC using rotated surface code.
 * Supports configurable boundary conditions (XXZZ, ZZXX).
 *
 * Parameters:
 * - Lx, Ly: Number of data qubits in x and y directions
 * - Lz: Number of z-layers
 * - boundary: Boundary specification for four sides
 *
 * 2D Layout:
 * - Data qubits: (2i, 2j) for i ∈ [0, Lx-1], j ∈ [0, Ly-1]
 * - Bulk ancillas at (odd, odd) within data bounds:
 *   - X-ancilla: (x+y) % 4 == 0
 *   - Z-ancilla: (x+y) % 4 == 2
 * - Boundary ancillas outside data region based on boundary conditions
 *
 * 3D Layer structure:
 * - Even z layers: data qubits + Z-ancillas
 * - Odd z layers: data qubits + X-ancillas
 *
 * Edges:
 * - Temporal: data at same (x,y) between consecutive z
 * - Spatial: ancilla to neighboring data qubits at (±1, ±1)
 *
 * Reference: Raussendorf, Harrington, Goyal - PhysRevA.82.032332
 */

import {
  DEFAULT_RHG_BOUNDARY,
  type RHGBoundary,
  type RHGEdge,
  type RHGLattice,
  type RHGNode,
  type RHGNodeRole,
  type RHGParams,
} from "@/types/rhg";
import type { GeneratedEdge, GeneratedGraph, GeneratedNode } from "@/types/tiling";

// =============================================================================
// 2D Coordinate Classification
// =============================================================================

/**
 * Check if (x, y) is a data qubit position.
 * Data qubits are at (even x, even y).
 */
export function isDataPosition(x: number, y: number): boolean {
  return x % 2 === 0 && y % 2 === 0;
}

/**
 * Check if (x, y) is an X-ancilla position.
 * X ancillas are at (odd x, odd y) where (x + y) % 4 == 0.
 */
export function isXAncillaPosition(x: number, y: number): boolean {
  return x % 2 === 1 && y % 2 === 1 && (x + y) % 4 === 0;
}

/**
 * Check if (x, y) is a Z-ancilla position.
 * Z ancillas are at (odd x, odd y) where (x + y) % 4 == 2.
 */
export function isZAncillaPosition(x: number, y: number): boolean {
  return x % 2 === 1 && y % 2 === 1 && (x + y) % 4 === 2;
}

/**
 * Determine the node role based on 2D position and z-layer.
 * - Even z: data + Z-ancillas
 * - Odd z: data + X-ancillas
 */
export function getNodeRole(x: number, y: number, z: number): RHGNodeRole | null {
  if (isDataPosition(x, y)) {
    return "data";
  }
  if (z % 2 === 0 && isZAncillaPosition(x, y)) {
    return "ancilla_z";
  }
  if (z % 2 === 1 && isXAncillaPosition(x, y)) {
    return "ancilla_x";
  }
  return null;
}

// =============================================================================
// Node ID Generation
// =============================================================================

/**
 * Generate a node ID from coordinates.
 */
function nodeId(x: number, y: number, z: number): string {
  return `${x}_${y}_${z}`;
}

/**
 * Normalize edge key for deduplication (alphabetically ordered).
 */
function normalizeEdgeKey(a: string, b: string): string {
  return a < b ? `${a}--${b}` : `${b}--${a}`;
}

// =============================================================================
// Ancilla Edge Offsets
// =============================================================================

/**
 * Offsets from ancilla to neighboring data qubits.
 * Ancillas connect to 4 data qubits at (±1, ±1) positions.
 */
const ANCILLA_EDGES: [number, number][] = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

// =============================================================================
// RHG Lattice Generator
// =============================================================================

/**
 * Generate 2D coordinates for data qubits and ancillas with boundary conditions.
 *
 * The layout consists of:
 * 1. Data qubits at (2i, 2j) for i ∈ [0, Lx-1], j ∈ [0, Ly-1]
 * 2. Bulk ancillas: (odd, odd) positions within the data region
 * 3. Boundary ancillas: Outside the data region based on boundary conditions
 *
 * @param Lx - Number of data qubits in x direction
 * @param Ly - Number of data qubits in y direction
 * @param boundary - Boundary specification for four sides
 * @returns Sets of data, X-ancilla, and Z-ancilla 2D positions
 */
function generate2DLayout(
  Lx: number,
  Ly: number,
  boundary: RHGBoundary
): {
  dataPositions: Set<string>;
  xAncillaPositions: Set<string>;
  zAncillaPositions: Set<string>;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const dataPositions = new Set<string>();
  const xAncillaPositions = new Set<string>();
  const zAncillaPositions = new Set<string>();

  // Data bounds (inclusive): x ∈ [0, 2*(Lx-1)], y ∈ [0, 2*(Ly-1)]
  const minX = 0;
  const minY = 0;
  const maxX = 2 * (Lx - 1);
  const maxY = 2 * (Ly - 1);

  // Data qubits at (2i, 2j) for i ∈ [0, Lx-1], j ∈ [0, Ly-1]
  for (let i = 0; i < Lx; i++) {
    for (let j = 0; j < Ly; j++) {
      dataPositions.add(`${2 * i}_${2 * j}`);
    }
  }

  // Bulk ancillas: (odd, odd) positions strictly inside the data region
  for (let x = minX + 1; x < maxX; x += 2) {
    for (let y = minY + 1; y < maxY; y += 2) {
      if (isXAncillaPosition(x, y)) {
        xAncillaPositions.add(`${x}_${y}`);
      } else if (isZAncillaPosition(x, y)) {
        zAncillaPositions.add(`${x}_${y}`);
      }
    }
  }

  // Boundary ancillas: Outside the data region based on boundary conditions
  // TOP boundary (y = minY - 1)
  for (let x = minX + 1; x < maxX; x += 2) {
    const relX = x - minX;
    const relXMod4 = relX % 4;
    const y = minY - 1;
    if (boundary.top === "X" && relXMod4 === 1) {
      xAncillaPositions.add(`${x}_${y}`);
    } else if (boundary.top === "Z" && relXMod4 === 3) {
      zAncillaPositions.add(`${x}_${y}`);
    }
  }

  // BOTTOM boundary (y = maxY + 1)
  for (let x = minX + 1; x < maxX; x += 2) {
    const relX = x - minX;
    const relXMod4 = relX % 4;
    const y = maxY + 1;
    if (boundary.bottom === "X" && relXMod4 === 3) {
      xAncillaPositions.add(`${x}_${y}`);
    } else if (boundary.bottom === "Z" && relXMod4 === 1) {
      zAncillaPositions.add(`${x}_${y}`);
    }
  }

  // LEFT boundary (x = minX - 1)
  for (let y = minY + 1; y < maxY; y += 2) {
    const relY = y - minY;
    const relYMod4 = relY % 4;
    const x = minX - 1;
    if (boundary.left === "X" && relYMod4 === 1) {
      xAncillaPositions.add(`${x}_${y}`);
    } else if (boundary.left === "Z" && relYMod4 === 3) {
      zAncillaPositions.add(`${x}_${y}`);
    }
  }

  // RIGHT boundary (x = maxX + 1)
  for (let y = minY + 1; y < maxY; y += 2) {
    const relY = y - minY;
    const relYMod4 = relY % 4;
    const x = maxX + 1;
    if (boundary.right === "X" && relYMod4 === 3) {
      xAncillaPositions.add(`${x}_${y}`);
    } else if (boundary.right === "Z" && relYMod4 === 1) {
      zAncillaPositions.add(`${x}_${y}`);
    }
  }

  return { dataPositions, xAncillaPositions, zAncillaPositions, minX, minY, maxX, maxY };
}

/**
 * Parse position string to coordinates.
 */
function parsePosition(pos: string): [number, number] {
  const parts = pos.split("_");
  const x = parts[0];
  const y = parts[1];
  if (x === undefined || y === undefined) {
    throw new Error(`Invalid position string: ${pos}`);
  }
  return [Number.parseInt(x, 10), Number.parseInt(y, 10)];
}

/**
 * Generate RHG lattice for rotated surface code with configurable boundaries.
 *
 * @param params - RHG generation parameters
 *   - Lx: Number of data qubits in x direction
 *   - Ly: Number of data qubits in y direction
 *   - Lz: Number of z-layers
 *   - boundary: Boundary specification (defaults to XXZZ)
 * @returns RHG lattice with nodes and edges
 */
export function generateRHGLattice(params: RHGParams): RHGLattice {
  const { Lx, Ly, Lz, boundary = DEFAULT_RHG_BOUNDARY } = params;

  // Validate parameters
  if (Lx < 1 || Ly < 1 || Lz < 1) {
    throw new Error("RHG lattice dimensions (Lx, Ly, Lz) must be at least 1");
  }

  const nodes: RHGNode[] = [];
  const edges: RHGEdge[] = [];
  const nodeMap = new Map<string, RHGNode>();
  const edgeSet = new Set<string>();

  // Generate 2D layout with boundary conditions
  const { dataPositions, xAncillaPositions, zAncillaPositions } = generate2DLayout(
    Lx,
    Ly,
    boundary
  );

  // Helper to add edge with deduplication
  const addEdge = (id1: string, id2: string): void => {
    const key = normalizeEdgeKey(id1, id2);
    if (!edgeSet.has(key) && nodeMap.has(id1) && nodeMap.has(id2)) {
      edgeSet.add(key);
      const [source, target] = id1 < id2 ? [id1, id2] : [id2, id1];
      edges.push({ id: key, source, target });
    }
  };

  // Generate nodes layer by layer
  for (let z = 0; z < Lz; z++) {
    const isEvenZ = z % 2 === 0;

    // Add data qubits
    for (const pos of dataPositions) {
      const [x, y] = parsePosition(pos);
      const id = nodeId(x, y, z);
      const node: RHGNode = {
        id,
        role: "data",
        position: [x, y, z],
      };
      nodes.push(node);
      nodeMap.set(id, node);

      // Temporal edge: connect to same (x, y) at previous z (data to data)
      if (z > 0) {
        const prevId = nodeId(x, y, z - 1);
        if (nodeMap.has(prevId)) {
          addEdge(id, prevId);
        }
      }
    }

    // Add ancillas based on z parity
    const ancillaPositions = isEvenZ ? zAncillaPositions : xAncillaPositions;
    const ancillaRole: RHGNodeRole = isEvenZ ? "ancilla_z" : "ancilla_x";

    for (const pos of ancillaPositions) {
      const [x, y] = parsePosition(pos);
      const id = nodeId(x, y, z);
      const node: RHGNode = {
        id,
        role: ancillaRole,
        position: [x, y, z],
      };
      nodes.push(node);
      nodeMap.set(id, node);

      // Spatial edges: connect to neighboring data qubits
      for (const [dx, dy] of ANCILLA_EDGES) {
        const nx = x + dx;
        const ny = y + dy;
        const neighborId = nodeId(nx, ny, z);
        addEdge(id, neighborId);
      }
    }
  }

  return {
    nodes,
    edges,
    size: { Lx, Ly, Lz },
  };
}

// =============================================================================
// Conversion to GeneratedGraph
// =============================================================================

/**
 * Convert RHG lattice to GeneratedGraph format for projectStore integration.
 *
 * @param lattice - RHG lattice to convert
 * @param origin - Optional origin offset
 * @returns GeneratedGraph compatible with projectStore
 */
export function rhgToGeneratedGraph(
  lattice: RHGLattice,
  origin?: { x: number; y: number; z: number }
): GeneratedGraph {
  const ox = origin?.x ?? 0;
  const oy = origin?.y ?? 0;
  const oz = origin?.z ?? 0;

  // Build ID mapping from original to offset IDs
  const idMap = new Map<string, string>();
  for (const node of lattice.nodes) {
    const newX = node.position[0] + ox;
    const newY = node.position[1] + oy;
    const newZ = node.position[2] + oz;
    idMap.set(node.id, `${newX}_${newY}_${newZ}`);
  }

  const nodes: GeneratedNode[] = lattice.nodes.map((node) => {
    const newId = idMap.get(node.id) ?? node.id;
    return {
      id: newId,
      position: [node.position[0] + ox, node.position[1] + oy, node.position[2] + oz],
      role: "intermediate" as const,
    };
  });

  const edges: GeneratedEdge[] = lattice.edges.map((edge) => {
    const newSource = idMap.get(edge.source) ?? edge.source;
    const newTarget = idMap.get(edge.target) ?? edge.target;
    const [source, target] =
      newSource < newTarget ? [newSource, newTarget] : [newTarget, newSource];
    return {
      id: `${source}--${target}`,
      source,
      target,
    };
  });

  return { nodes, edges };
}

// =============================================================================
// Node Count Estimation
// =============================================================================

/**
 * Estimate the number of nodes in an RHG lattice.
 *
 * @param Lx - Number of data qubits in x direction
 * @param Ly - Number of data qubits in y direction
 * @param Lz - Number of z-layers
 * @param boundary - Boundary specification (defaults to XXZZ)
 */
export function estimateRHGNodeCount(
  Lx: number,
  Ly: number,
  Lz: number,
  boundary: RHGBoundary = DEFAULT_RHG_BOUNDARY
): number {
  const { dataPositions, xAncillaPositions, zAncillaPositions } = generate2DLayout(
    Lx,
    Ly,
    boundary
  );

  const dataPerLayer = dataPositions.size;
  const xAncillaCount = xAncillaPositions.size;
  const zAncillaCount = zAncillaPositions.size;

  const evenLayers = Math.ceil(Lz / 2);
  const oddLayers = Math.floor(Lz / 2);

  return dataPerLayer * Lz + zAncillaCount * evenLayers + xAncillaCount * oddLayers;
}

/**
 * Estimate the number of edges in an RHG lattice.
 *
 * @param Lx - Number of data qubits in x direction
 * @param Ly - Number of data qubits in y direction
 * @param Lz - Number of z-layers
 * @param boundary - Boundary specification (defaults to XXZZ)
 */
export function estimateRHGEdgeCount(
  Lx: number,
  Ly: number,
  Lz: number,
  boundary: RHGBoundary = DEFAULT_RHG_BOUNDARY
): number {
  try {
    const lattice = generateRHGLattice({ Lx, Ly, Lz, boundary });
    return lattice.edges.length;
  } catch {
    const nodeCount = estimateRHGNodeCount(Lx, Ly, Lz, boundary);
    return Math.floor(nodeCount * 2);
  }
}

// =============================================================================
// 3D Cubic Grid Generator
// =============================================================================

/**
 * Generate a simple 3D cubic grid.
 */
export function generateCubicGrid(
  Lx: number,
  Ly: number,
  Lz: number,
  origin?: { x: number; y: number; z: number }
): GeneratedGraph {
  const ox = origin?.x ?? 0;
  const oy = origin?.y ?? 0;
  const oz = origin?.z ?? 0;

  const nodes: GeneratedNode[] = [];
  const edges: GeneratedEdge[] = [];
  const edgeSet = new Set<string>();

  const nodeIdFn = (x: number, y: number, z: number): string => `${x}_${y}_${z}`;

  const addEdge = (id1: string, id2: string): void => {
    const key = normalizeEdgeKey(id1, id2);
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      const [source, target] = id1 < id2 ? [id1, id2] : [id2, id1];
      edges.push({ id: key, source, target });
    }
  };

  for (let x = 0; x < Lx; x++) {
    for (let y = 0; y < Ly; y++) {
      for (let z = 0; z < Lz; z++) {
        const id = nodeIdFn(x + ox, y + oy, z + oz);
        nodes.push({
          id,
          position: [x + ox, y + oy, z + oz],
          role: "intermediate",
        });

        if (x < Lx - 1) {
          addEdge(id, nodeIdFn(x + 1 + ox, y + oy, z + oz));
        }
        if (y < Ly - 1) {
          addEdge(id, nodeIdFn(x + ox, y + 1 + oy, z + oz));
        }
        if (z < Lz - 1) {
          addEdge(id, nodeIdFn(x + ox, y + oy, z + 1 + oz));
        }
      }
    }
  }

  return { nodes, edges };
}

/**
 * Estimate the number of nodes in a cubic grid.
 */
export function estimateCubicNodeCount(Lx: number, Ly: number, Lz: number): number {
  return Lx * Ly * Lz;
}

/**
 * Estimate the number of edges in a cubic grid.
 */
export function estimateCubicEdgeCount(Lx: number, Ly: number, Lz: number): number {
  return (Lx - 1) * Ly * Lz + Lx * (Ly - 1) * Lz + Lx * Ly * (Lz - 1);
}
