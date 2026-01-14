/**
 * RHG (Raussendorf-Harrington-Goyal) Lattice Type Definitions
 *
 * RHG lattice is a 3D cluster state for fault-tolerant MBQC.
 * Qubits are placed on faces and edges of a cubic lattice.
 * Each face qubit connects to exactly 4 edge qubits (bipartite graph).
 *
 * Reference: Raussendorf, Harrington, Goyal - PhysRevA.82.032332
 */

/**
 * RHG lattice node kind.
 * FACE: Face qubits positioned on cube faces (XY, XZ, YZ planes)
 * EDGE: Edge qubits positioned on cube edges (X, Y, Z directions)
 */
export type RHGNodeKind = "FACE" | "EDGE";

/**
 * RHG node orientation.
 * Face orientations: Fx (YZ plane), Fy (XZ plane), Fz (XY plane)
 * Edge orientations: Ex (x-direction), Ey (y-direction), Ez (z-direction)
 */
export type RHGOrientation = "Fx" | "Fy" | "Fz" | "Ex" | "Ey" | "Ez";

/**
 * RHG generated node with full metadata.
 */
export interface RHGNode {
  /** Node ID in format "Fz(i,j,k)" or "Ex(i,j,k)" */
  id: string;

  /** Node kind (FACE or EDGE) */
  kind: RHGNodeKind;

  /** Node orientation */
  orientation: RHGOrientation;

  /** Integer index coordinates (i, j, k) */
  indices: [number, number, number];

  /**
   * Position using 2x integer coordinates to avoid floating point.
   * This follows the spec: Ex: (2i+1, 2j, 2k), Fz: (2i+1, 2j+1, 2k), etc.
   */
  pos2: [number, number, number];

  /**
   * Actual position for rendering (pos2 / 2).
   * This gives the real-world coordinate of the node.
   */
  position: [number, number, number];
}

/**
 * RHG generated edge (only face-edge connections).
 * The RHG lattice is bipartite: edges only connect faces to edges, never same kind.
 */
export interface RHGEdge {
  /** Edge ID in format "faceId--edgeId" */
  id: string;

  /** Face node ID (e.g., "Fz(0,0,0)") */
  faceId: string;

  /** Edge node ID (e.g., "Ex(0,0,0)") */
  edgeId: string;
}

/**
 * RHG lattice generation result.
 */
export interface RHGLattice {
  /** All nodes in the lattice (both face and edge qubits) */
  nodes: RHGNode[];

  /** All edges in the lattice (face-edge connections only) */
  edges: RHGEdge[];

  /** Lattice dimensions (number of cubic cells in each direction) */
  size: {
    Lx: number;
    Ly: number;
    Lz: number;
  };
}

/**
 * RHG generation parameters.
 */
export interface RHGParams {
  /** Number of cells in X direction (must be >= 1) */
  Lx: number;

  /** Number of cells in Y direction (must be >= 1) */
  Ly: number;

  /** Number of cells in Z direction (must be >= 1) */
  Lz: number;

  /**
   * Origin offset applied to all node positions.
   * Defaults to (0, 0, 0).
   */
  origin?: {
    x: number;
    y: number;
    z: number;
  };
}

/**
 * 3D tiling pattern type.
 */
export type Tiling3DPatternId = "cubic" | "rhg";

/**
 * 3D tiling generation parameters.
 */
export interface Tiling3DParams {
  /** Pattern ID */
  patternId: Tiling3DPatternId;

  /** Number of cells in X direction */
  Lx: number;

  /** Number of cells in Y direction */
  Ly: number;

  /** Number of cells in Z direction */
  Lz: number;

  /** Origin X coordinate */
  originX: number;

  /** Origin Y coordinate */
  originY: number;

  /** Origin Z coordinate */
  originZ: number;
}

/**
 * Default 3D tiling parameters.
 */
export const DEFAULT_TILING_3D_PARAMS: Tiling3DParams = {
  patternId: "cubic",
  Lx: 2,
  Ly: 2,
  Lz: 2,
  originX: 0,
  originY: 0,
  originZ: 0,
};
