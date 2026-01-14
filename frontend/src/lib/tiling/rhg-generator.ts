/**
 * RHG (Raussendorf-Harrington-Goyal) Lattice Generator
 *
 * Generates RHG lattice following the specification exactly.
 * RHG lattice places qubits on faces and edges of a 3D cubic lattice,
 * with each face qubit connecting to exactly 4 edge qubits (bipartite).
 *
 * Reference: Raussendorf, Harrington, Goyal - PhysRevA.82.032332
 *
 * Index ranges (for Lx × Ly × Lz cells, open boundary):
 * - Ex(i,j,k): i=0..Lx-1, j=0..Ly, k=0..Lz
 * - Ey(i,j,k): i=0..Lx, j=0..Ly-1, k=0..Lz
 * - Ez(i,j,k): i=0..Lx, j=0..Ly, k=0..Lz-1
 * - Fz(i,j,k): i=0..Lx-1, j=0..Ly-1, k=0..Lz
 * - Fy(i,j,k): i=0..Lx-1, j=0..Ly, k=0..Lz-1
 * - Fx(i,j,k): i=0..Lx, j=0..Ly-1, k=0..Lz-1
 *
 * Position (2x integer coords to avoid floating point):
 * - Ex: (2i+1, 2j, 2k)
 * - Ey: (2i, 2j+1, 2k)
 * - Ez: (2i, 2j, 2k+1)
 * - Fz: (2i+1, 2j+1, 2k)
 * - Fy: (2i+1, 2j, 2k+1)
 * - Fx: (2i, 2j+1, 2k+1)
 *
 * Edge connectivity (Face → 4 Edges):
 * - Fz(i,j,k): Ex(i,j,k), Ex(i,j+1,k), Ey(i,j,k), Ey(i+1,j,k)
 * - Fy(i,j,k): Ex(i,j,k), Ex(i,j,k+1), Ez(i,j,k), Ez(i+1,j,k)
 * - Fx(i,j,k): Ey(i,j,k), Ey(i,j,k+1), Ez(i,j,k), Ez(i,j+1,k)
 */

import type { RHGEdge, RHGLattice, RHGNode, RHGParams } from "@/types/rhg";
import type { GeneratedEdge, GeneratedGraph, GeneratedNode } from "@/types/tiling";

// =============================================================================
// Node ID Generators
// =============================================================================

/**
 * Generate Ex node ID
 */
function exId(i: number, j: number, k: number): string {
  return `Ex(${i},${j},${k})`;
}

/**
 * Generate Ey node ID
 */
function eyId(i: number, j: number, k: number): string {
  return `Ey(${i},${j},${k})`;
}

/**
 * Generate Ez node ID
 */
function ezId(i: number, j: number, k: number): string {
  return `Ez(${i},${j},${k})`;
}

/**
 * Generate Fx node ID
 */
function fxId(i: number, j: number, k: number): string {
  return `Fx(${i},${j},${k})`;
}

/**
 * Generate Fy node ID
 */
function fyId(i: number, j: number, k: number): string {
  return `Fy(${i},${j},${k})`;
}

/**
 * Generate Fz node ID
 */
function fzId(i: number, j: number, k: number): string {
  return `Fz(${i},${j},${k})`;
}

// =============================================================================
// RHG Lattice Generator
// =============================================================================

/**
 * Generate RHG lattice following the specification exactly.
 *
 * @param params - RHG generation parameters (Lx, Ly, Lz, origin)
 * @returns RHG lattice with nodes and edges
 */
export function generateRHGLattice(params: RHGParams): RHGLattice {
  const { Lx, Ly, Lz } = params;

  // Validate parameters
  if (Lx < 1 || Ly < 1 || Lz < 1) {
    throw new Error("RHG lattice dimensions must be at least 1");
  }

  const nodes: RHGNode[] = [];
  const edges: RHGEdge[] = [];
  const nodeMap = new Map<string, RHGNode>();

  // Helper to add a node
  const addNode = (
    id: string,
    kind: "FACE" | "EDGE",
    orientation: RHGNode["orientation"],
    indices: [number, number, number],
    pos2: [number, number, number]
  ): void => {
    const node: RHGNode = {
      id,
      kind,
      orientation,
      indices,
      pos2,
      position: [pos2[0] / 2, pos2[1] / 2, pos2[2] / 2],
    };
    nodes.push(node);
    nodeMap.set(id, node);
  };

  // Helper to add an edge (face-edge connection)
  const addEdge = (faceId: string, edgeId: string): void => {
    if (nodeMap.has(faceId) && nodeMap.has(edgeId)) {
      edges.push({
        id: `${faceId}--${edgeId}`,
        faceId,
        edgeId,
      });
    }
  };

  // ==========================================================================
  // Generate EDGE nodes
  // ==========================================================================

  // Ex(i,j,k): i=0..Lx-1, j=0..Ly, k=0..Lz
  // pos2 = (2i+1, 2j, 2k)
  for (let i = 0; i < Lx; i++) {
    for (let j = 0; j <= Ly; j++) {
      for (let k = 0; k <= Lz; k++) {
        addNode(exId(i, j, k), "EDGE", "Ex", [i, j, k], [2 * i + 1, 2 * j, 2 * k]);
      }
    }
  }

  // Ey(i,j,k): i=0..Lx, j=0..Ly-1, k=0..Lz
  // pos2 = (2i, 2j+1, 2k)
  for (let i = 0; i <= Lx; i++) {
    for (let j = 0; j < Ly; j++) {
      for (let k = 0; k <= Lz; k++) {
        addNode(eyId(i, j, k), "EDGE", "Ey", [i, j, k], [2 * i, 2 * j + 1, 2 * k]);
      }
    }
  }

  // Ez(i,j,k): i=0..Lx, j=0..Ly, k=0..Lz-1
  // pos2 = (2i, 2j, 2k+1)
  for (let i = 0; i <= Lx; i++) {
    for (let j = 0; j <= Ly; j++) {
      for (let k = 0; k < Lz; k++) {
        addNode(ezId(i, j, k), "EDGE", "Ez", [i, j, k], [2 * i, 2 * j, 2 * k + 1]);
      }
    }
  }

  // ==========================================================================
  // Generate FACE nodes and their edge connections
  // ==========================================================================

  // Fz(i,j,k): i=0..Lx-1, j=0..Ly-1, k=0..Lz
  // pos2 = (2i+1, 2j+1, 2k)
  // Connects to: Ex(i,j,k), Ex(i,j+1,k), Ey(i,j,k), Ey(i+1,j,k)
  for (let i = 0; i < Lx; i++) {
    for (let j = 0; j < Ly; j++) {
      for (let k = 0; k <= Lz; k++) {
        const fid = fzId(i, j, k);
        addNode(fid, "FACE", "Fz", [i, j, k], [2 * i + 1, 2 * j + 1, 2 * k]);

        // Connect to 4 edge qubits
        addEdge(fid, exId(i, j, k));
        addEdge(fid, exId(i, j + 1, k));
        addEdge(fid, eyId(i, j, k));
        addEdge(fid, eyId(i + 1, j, k));
      }
    }
  }

  // Fy(i,j,k): i=0..Lx-1, j=0..Ly, k=0..Lz-1
  // pos2 = (2i+1, 2j, 2k+1)
  // Connects to: Ex(i,j,k), Ex(i,j,k+1), Ez(i,j,k), Ez(i+1,j,k)
  for (let i = 0; i < Lx; i++) {
    for (let j = 0; j <= Ly; j++) {
      for (let k = 0; k < Lz; k++) {
        const fid = fyId(i, j, k);
        addNode(fid, "FACE", "Fy", [i, j, k], [2 * i + 1, 2 * j, 2 * k + 1]);

        // Connect to 4 edge qubits
        addEdge(fid, exId(i, j, k));
        addEdge(fid, exId(i, j, k + 1));
        addEdge(fid, ezId(i, j, k));
        addEdge(fid, ezId(i + 1, j, k));
      }
    }
  }

  // Fx(i,j,k): i=0..Lx, j=0..Ly-1, k=0..Lz-1
  // pos2 = (2i, 2j+1, 2k+1)
  // Connects to: Ey(i,j,k), Ey(i,j,k+1), Ez(i,j,k), Ez(i,j+1,k)
  for (let i = 0; i <= Lx; i++) {
    for (let j = 0; j < Ly; j++) {
      for (let k = 0; k < Lz; k++) {
        const fid = fxId(i, j, k);
        addNode(fid, "FACE", "Fx", [i, j, k], [2 * i, 2 * j + 1, 2 * k + 1]);

        // Connect to 4 edge qubits
        addEdge(fid, eyId(i, j, k));
        addEdge(fid, eyId(i, j, k + 1));
        addEdge(fid, ezId(i, j, k));
        addEdge(fid, ezId(i, j + 1, k));
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
 * Normalize edge key for deduplication (alphabetically ordered).
 */
function normalizeEdgeKey(a: string, b: string): string {
  return a < b ? `${a}--${b}` : `${b}--${a}`;
}

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

  const nodes: GeneratedNode[] = lattice.nodes.map((node) => ({
    id: node.id,
    position: [node.position[0] + ox, node.position[1] + oy, node.position[2] + oz],
    role: "intermediate" as const,
  }));

  const edges: GeneratedEdge[] = lattice.edges.map((edge) => {
    // Normalize edge IDs for consistency with other tiling patterns
    const normalizedId = normalizeEdgeKey(edge.faceId, edge.edgeId);
    const [source, target] =
      edge.faceId < edge.edgeId ? [edge.faceId, edge.edgeId] : [edge.edgeId, edge.faceId];
    return {
      id: normalizedId,
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
 * Node counts for Lx × Ly × Lz:
 * - Ex: Lx × (Ly+1) × (Lz+1)
 * - Ey: (Lx+1) × Ly × (Lz+1)
 * - Ez: (Lx+1) × (Ly+1) × Lz
 * - Fz: Lx × Ly × (Lz+1)
 * - Fy: Lx × (Ly+1) × Lz
 * - Fx: (Lx+1) × Ly × Lz
 */
export function estimateRHGNodeCount(Lx: number, Ly: number, Lz: number): number {
  // Edge nodes
  const exCount = Lx * (Ly + 1) * (Lz + 1);
  const eyCount = (Lx + 1) * Ly * (Lz + 1);
  const ezCount = (Lx + 1) * (Ly + 1) * Lz;

  // Face nodes
  const fzCount = Lx * Ly * (Lz + 1);
  const fyCount = Lx * (Ly + 1) * Lz;
  const fxCount = (Lx + 1) * Ly * Lz;

  return exCount + eyCount + ezCount + fzCount + fyCount + fxCount;
}

/**
 * Estimate the number of edges in an RHG lattice.
 * Each face node connects to 4 edge nodes.
 */
export function estimateRHGEdgeCount(Lx: number, Ly: number, Lz: number): number {
  // Face nodes
  const fzCount = Lx * Ly * (Lz + 1);
  const fyCount = Lx * (Ly + 1) * Lz;
  const fxCount = (Lx + 1) * Ly * Lz;

  // Each face connects to 4 edges
  return (fzCount + fyCount + fxCount) * 4;
}

// =============================================================================
// 3D Cubic Grid Generator (using existing pattern)
// =============================================================================

/**
 * Generate a simple 3D cubic grid.
 * This is a straightforward grid where nodes are at integer coordinates
 * and each node connects to its 6 neighbors (±x, ±y, ±z).
 *
 * @param Lx - Number of cells in X direction
 * @param Ly - Number of cells in Y direction
 * @param Lz - Number of cells in Z direction
 * @param origin - Optional origin offset
 * @returns GeneratedGraph for the cubic grid
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

  // Generate node ID from coordinates
  const nodeId = (x: number, y: number, z: number): string => `${x}_${y}_${z}`;

  // Add edge with deduplication
  const addEdge = (id1: string, id2: string): void => {
    const key = normalizeEdgeKey(id1, id2);
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      const [source, target] = id1 < id2 ? [id1, id2] : [id2, id1];
      edges.push({ id: key, source, target });
    }
  };

  // Generate nodes at vertices of the grid
  // For Lx cells, we have Lx+1 vertices in each direction
  for (let x = 0; x <= Lx; x++) {
    for (let y = 0; y <= Ly; y++) {
      for (let z = 0; z <= Lz; z++) {
        const id = nodeId(x + ox, y + oy, z + oz);
        nodes.push({
          id,
          position: [x + ox, y + oy, z + oz],
          role: "intermediate",
        });

        // Connect to neighbors in +x, +y, +z directions (to avoid duplicates)
        if (x < Lx) {
          addEdge(id, nodeId(x + 1 + ox, y + oy, z + oz));
        }
        if (y < Ly) {
          addEdge(id, nodeId(x + ox, y + 1 + oy, z + oz));
        }
        if (z < Lz) {
          addEdge(id, nodeId(x + ox, y + oy, z + 1 + oz));
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
  return (Lx + 1) * (Ly + 1) * (Lz + 1);
}

/**
 * Estimate the number of edges in a cubic grid.
 */
export function estimateCubicEdgeCount(Lx: number, Ly: number, Lz: number): number {
  // X-direction edges: Lx * (Ly+1) * (Lz+1)
  // Y-direction edges: (Lx+1) * Ly * (Lz+1)
  // Z-direction edges: (Lx+1) * (Ly+1) * Lz
  return Lx * (Ly + 1) * (Lz + 1) + (Lx + 1) * Ly * (Lz + 1) + (Lx + 1) * (Ly + 1) * Lz;
}
