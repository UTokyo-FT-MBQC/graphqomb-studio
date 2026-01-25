/**
 * RHG (Raussendorf-Harrington-Goyal) Lattice Type Definitions
 *
 * RHG lattice is a 3D cluster state for fault-tolerant MBQC using rotated surface code.
 *
 * 2D Layout (repeated at each z-level):
 * - Data qubits: (even x, even y)
 * - X ancillas: (odd x, odd y) where (x + y) % 4 == 0
 * - Z ancillas: (odd x, odd y) where (x + y) % 4 == 2
 *
 * 3D Layer structure:
 * - Even z layers: data qubits + Z-ancillas
 * - Odd z layers: data qubits + X-ancillas
 *
 * Boundary conditions determine which ancillas are placed outside the data region.
 *
 * Reference: Raussendorf, Harrington, Goyal - PhysRevA.82.032332
 */

// =============================================================================
// Boundary Type Definitions
// =============================================================================

/**
 * Boundary sides of the 2D patch.
 */
export type BoundarySide = "top" | "bottom" | "left" | "right";

/**
 * Edge specification values for boundary conditions.
 * - X: X-type boundary (X ancillas on this edge)
 * - Z: Z-type boundary (Z ancillas on this edge)
 */
export type EdgeSpecValue = "X" | "Z";

/**
 * Boundary specification for all four sides.
 */
export interface RHGBoundary {
  top: EdgeSpecValue;
  bottom: EdgeSpecValue;
  left: EdgeSpecValue;
  right: EdgeSpecValue;
}

/**
 * Standard boundary presets for rotated surface code.
 * XXZZ: X boundaries on top/bottom, Z boundaries on left/right
 * ZZXX: Z boundaries on top/bottom, X boundaries on left/right
 */
export const RHG_BOUNDARY_PRESETS = {
  XXZZ: { top: "X", bottom: "X", left: "Z", right: "Z" } as const satisfies RHGBoundary,
  ZZXX: { top: "Z", bottom: "Z", left: "X", right: "X" } as const satisfies RHGBoundary,
} as const;

/**
 * Boundary preset type.
 */
export type RHGBoundaryPresetId = keyof typeof RHG_BOUNDARY_PRESETS;

/**
 * Default boundary (XXZZ).
 */
export const DEFAULT_RHG_BOUNDARY: RHGBoundary = RHG_BOUNDARY_PRESETS.XXZZ;

// =============================================================================
// Node Type Definitions
// =============================================================================

/**
 * RHG node role in the lattice.
 * - data: Data qubits for logical information
 * - ancilla_x: X-type ancilla qubits (at odd z layers)
 * - ancilla_z: Z-type ancilla qubits (at even z layers)
 */
export type RHGNodeRole = "data" | "ancilla_x" | "ancilla_z";

/**
 * RHG generated node with full metadata.
 */
export interface RHGNode {
  /** Node ID in format "x_y_z" */
  id: string;

  /** Node role (data, ancilla_x, ancilla_z) */
  role: RHGNodeRole;

  /** Integer coordinates (x, y, z) */
  position: [number, number, number];
}

/**
 * RHG generated edge (connects adjacent nodes).
 */
export interface RHGEdge {
  /** Edge ID in format "id1--id2" (alphabetically ordered) */
  id: string;

  /** Source node ID */
  source: string;

  /** Target node ID */
  target: string;
}

/**
 * RHG lattice generation result.
 */
export interface RHGLattice {
  /** All nodes in the lattice */
  nodes: RHGNode[];

  /** All edges in the lattice */
  edges: RHGEdge[];

  /** Lattice dimensions (physical size) */
  size: {
    /** Physical X dimension */
    Lx: number;
    /** Physical Y dimension */
    Ly: number;
    /** Physical Z dimension (number of layers) */
    Lz: number;
  };
}

/**
 * RHG generation parameters.
 * Lx, Ly, Lz directly specify the physical size of the lattice.
 */
export interface RHGParams {
  /** Number of data qubits in X direction (must be >= 1) */
  Lx: number;

  /** Number of data qubits in Y direction (must be >= 1) */
  Ly: number;

  /** Number of z-layers (must be >= 1) */
  Lz: number;

  /**
   * Boundary specification for the four sides.
   * Defaults to XXZZ (X on top/bottom, Z on left/right).
   */
  boundary?: RHGBoundary;

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
 * Both Cubic and RHG use Lx, Ly, Lz to specify physical dimensions.
 */
export interface Tiling3DParams {
  /** Pattern ID */
  patternId: Tiling3DPatternId;

  /** Number of data qubits (for RHG) or grid size (for cubic) in X direction */
  Lx: number;

  /** Number of data qubits (for RHG) or grid size (for cubic) in Y direction */
  Ly: number;

  /** Number of z-layers */
  Lz: number;

  /** Origin X coordinate */
  originX: number;

  /** Origin Y coordinate */
  originY: number;

  /** Origin Z coordinate */
  originZ: number;

  /** Boundary preset for RHG (only used when patternId is "rhg") */
  boundaryPreset: RHGBoundaryPresetId;
}

/**
 * Default 3D tiling parameters.
 */
export const DEFAULT_TILING_3D_PARAMS: Tiling3DParams = {
  patternId: "cubic",
  Lx: 3,
  Ly: 3,
  Lz: 3,
  originX: 0,
  originY: 0,
  originZ: 0,
  boundaryPreset: "XXZZ",
};
