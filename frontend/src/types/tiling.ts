import { z } from "zod";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Unit cell node definition.
 * Represents a node within the unit cell with relative coordinates.
 */
export interface UnitCellNode {
  /** Relative ID within the unit cell (e.g., "a", "b") */
  id: string;
  /** Offset from unit cell origin (x, y, z) in lattice coordinate space */
  offset: [number, number, number];
  /** Node role (default: "intermediate") */
  role?: "input" | "output" | "intermediate";
}

/**
 * Unit cell edge definition.
 * Represents an edge within the unit cell, potentially connecting to neighboring cells.
 */
export interface UnitCellEdge {
  /** Source node ID within unit cell */
  source: string;
  /** Target node ID within unit cell */
  target: string;
  /**
   * Target cell offset for boundary connections.
   * [0,0,0] = same cell, [1,0,0] = +X neighbor, etc.
   * Default: [0,0,0]
   */
  cellOffset?: [number, number, number];
}

/**
 * Tiling pattern definition.
 * Describes a periodic graph structure for MBQC.
 */
export interface TilingPattern {
  /** Schema version for forward compatibility */
  schemaVersion: 1;
  /** Pattern identifier (unique) */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Dimensionality: 2 or 3 */
  dimension: 2 | 3;
  /** Lattice vectors defining the periodic structure */
  latticeVectors: {
    a1: [number, number, number];
    a2: [number, number, number];
    a3?: [number, number, number]; // Required for 3D
  };
  /** Unit cell definition */
  unitCell: {
    nodes: UnitCellNode[];
    edges: UnitCellEdge[];
  };
}

/**
 * Cell coordinate range for tiling generation.
 */
export interface CellRange {
  x: [number, number]; // [min, max] inclusive
  y: [number, number];
  z?: [number, number]; // Required for 3D patterns
}

/**
 * Generated graph from tiling.
 */
export interface GeneratedGraph {
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
}

/**
 * Generated node with global ID and position.
 */
export interface GeneratedNode {
  id: string;
  position: [number, number, number];
  role: "input" | "output" | "intermediate";
}

/**
 * Generated edge (undirected).
 */
export interface GeneratedEdge {
  id: string;
  source: string;
  target: string;
}

// =============================================================================
// Zod Schemas
// =============================================================================

const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const UnitCellNodeSchema = z.object({
  id: z.string().min(1),
  offset: Vec3Schema,
  role: z.enum(["input", "output", "intermediate"]).optional(),
});

export const UnitCellEdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  cellOffset: Vec3Schema.optional(),
});

const LatticeVectors2DSchema = z.object({
  a1: Vec3Schema,
  a2: Vec3Schema,
  a3: Vec3Schema.optional(),
});

const LatticeVectors3DSchema = z.object({
  a1: Vec3Schema,
  a2: Vec3Schema,
  a3: Vec3Schema,
});

const UnitCellSchema = z.object({
  nodes: z.array(UnitCellNodeSchema).min(1),
  edges: z.array(UnitCellEdgeSchema),
});

/**
 * Base schema for TilingPattern without refinements.
 */
const TilingPatternBaseSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  dimension: z.union([z.literal(2), z.literal(3)]),
  latticeVectors: z.union([LatticeVectors2DSchema, LatticeVectors3DSchema]),
  unitCell: UnitCellSchema,
});

/**
 * Full TilingPattern schema with all refinements.
 */
export const TilingPatternSchema = TilingPatternBaseSchema.superRefine((data, ctx) => {
  const nodeIds = new Set(data.unitCell.nodes.map((n) => n.id));

  // Check for unique node IDs within unit cell
  if (nodeIds.size !== data.unitCell.nodes.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Node IDs must be unique within the unit cell",
      path: ["unitCell", "nodes"],
    });
  }

  // Check that edge source/target reference existing nodes
  for (let i = 0; i < data.unitCell.edges.length; i++) {
    const edge = data.unitCell.edges[i];
    if (edge === undefined) continue;
    if (!nodeIds.has(edge.source)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Edge source "${edge.source}" does not reference an existing node`,
        path: ["unitCell", "edges", i, "source"],
      });
    }
    if (!nodeIds.has(edge.target)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Edge target "${edge.target}" does not reference an existing node`,
        path: ["unitCell", "edges", i, "target"],
      });
    }
  }

  // 3D patterns require a3
  if (data.dimension === 3 && data.latticeVectors.a3 === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "3D patterns require latticeVectors.a3",
      path: ["latticeVectors", "a3"],
    });
  }

  // 2D patterns: all z-components must be 0
  if (data.dimension === 2) {
    // Check lattice vectors
    if (data.latticeVectors.a1[2] !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "2D patterns require a1[2] === 0",
        path: ["latticeVectors", "a1"],
      });
    }
    if (data.latticeVectors.a2[2] !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "2D patterns require a2[2] === 0",
        path: ["latticeVectors", "a2"],
      });
    }

    // Check node offsets
    for (let i = 0; i < data.unitCell.nodes.length; i++) {
      const node = data.unitCell.nodes[i];
      if (node === undefined) continue;
      if (node.offset[2] !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "2D patterns require node offset[2] === 0",
          path: ["unitCell", "nodes", i, "offset"],
        });
      }
    }

    // Check edge cellOffsets
    for (let i = 0; i < data.unitCell.edges.length; i++) {
      const edge = data.unitCell.edges[i];
      if (edge === undefined) continue;
      const cellOffset = edge.cellOffset;
      if (cellOffset !== undefined && cellOffset[2] !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "2D patterns require edge cellOffset[2] === 0",
          path: ["unitCell", "edges", i, "cellOffset"],
        });
      }
    }
  }
});

export const CellRangeSchema = z.object({
  x: z.tuple([z.number().int(), z.number().int()]),
  y: z.tuple([z.number().int(), z.number().int()]),
  z: z.tuple([z.number().int(), z.number().int()]).optional(),
});

export const GeneratedNodeSchema = z.object({
  id: z.string(),
  position: Vec3Schema,
  role: z.enum(["input", "output", "intermediate"]),
});

export const GeneratedEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});

export const GeneratedGraphSchema = z.object({
  nodes: z.array(GeneratedNodeSchema),
  edges: z.array(GeneratedEdgeSchema),
});

// =============================================================================
// Type Guards and Utilities
// =============================================================================

/**
 * Type guard to check if a pattern is 2D.
 */
export function is2DPattern(pattern: TilingPattern): boolean {
  return pattern.dimension === 2;
}

/**
 * Type guard to check if a pattern is 3D.
 */
export function is3DPattern(pattern: TilingPattern): boolean {
  return pattern.dimension === 3;
}

/**
 * Parse and validate a tiling pattern from unknown data.
 */
export function parseTilingPattern(data: unknown): TilingPattern {
  return TilingPatternSchema.parse(data) as TilingPattern;
}

/**
 * Safely parse a tiling pattern, returning a result object.
 */
export function safeParseTilingPattern(
  data: unknown
): { success: true; data: TilingPattern } | { success: false; error: z.ZodError } {
  const result = TilingPatternSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as TilingPattern };
  }
  return { success: false, error: result.error };
}
