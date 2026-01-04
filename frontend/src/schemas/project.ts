/**
 * GraphQOMB Studio Zod Schemas
 *
 * These schemas are used for validation and parsing of project data.
 * They correspond to the TypeScript types in @/types/index.ts
 */

import { z } from "zod";

// === Coordinate Schemas ===
// .strict() prevents extra fields
// 3D is evaluated first (important: 2D should not incorrectly accept 3D)

export const Coordinate2DSchema = z
  .object({
    x: z.number(),
    y: z.number(),
  })
  .strict();

export const Coordinate3DSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  })
  .strict();

// Important: 3D first to ensure proper discrimination
export const CoordinateSchema = z.union([Coordinate3DSchema, Coordinate2DSchema]);

// === Measurement Basis Schemas ===

export const PlaneSchema = z.enum(["XY", "YZ", "XZ"]);
export const AxisSchema = z.enum(["X", "Y", "Z"]);
export const SignSchema = z.enum(["PLUS", "MINUS"]);

export const PlannerMeasBasisSchema = z
  .object({
    type: z.literal("planner"),
    plane: PlaneSchema,
    angleCoeff: z.number(),
  })
  .strict();

export const AxisMeasBasisSchema = z
  .object({
    type: z.literal("axis"),
    axis: AxisSchema,
    sign: SignSchema,
  })
  .strict();

export const MeasBasisSchema = z.discriminatedUnion("type", [
  PlannerMeasBasisSchema,
  AxisMeasBasisSchema,
]);

// === Node Schemas (role-based conditional requirements) ===

export const InputNodeSchema = z
  .object({
    id: z.string().min(1),
    coordinate: CoordinateSchema,
    role: z.literal("input"),
    measBasis: MeasBasisSchema,
    qubitIndex: z.number().int().nonnegative(),
  })
  .strict();

export const OutputNodeSchema = z
  .object({
    id: z.string().min(1),
    coordinate: CoordinateSchema,
    role: z.literal("output"),
    measBasis: z.undefined().optional(),
    qubitIndex: z.number().int().nonnegative(),
  })
  .strict();

export const IntermediateNodeSchema = z
  .object({
    id: z.string().min(1),
    coordinate: CoordinateSchema,
    role: z.literal("intermediate"),
    measBasis: MeasBasisSchema,
    qubitIndex: z.undefined().optional(),
  })
  .strict();

export const GraphNodeSchema = z.discriminatedUnion("role", [
  InputNodeSchema,
  OutputNodeSchema,
  IntermediateNodeSchema,
]);

// === Edge Schema ===

export const GraphEdgeSchema = z
  .object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
  })
  .strict()
  .refine(
    (edge) => {
      // Verify edge ID is normalized (sorted source-target)
      const [a, b] = [edge.source, edge.target].sort();
      return edge.id === `${a}-${b}`;
    },
    { message: "Edge id must be normalized (sorted source-target)" }
  );

// === Flow Schema ===

export const FlowDefinitionSchema = z
  .object({
    xflow: z.record(z.string(), z.array(z.string())),
    zflow: z.union([z.record(z.string(), z.array(z.string())), z.literal("auto")]),
  })
  .strict();

export const ResolvedFlowSchema = z
  .object({
    xflow: z.record(z.string(), z.array(z.string())),
    zflow: z.record(z.string(), z.array(z.string())),
  })
  .strict();

// === Schedule Schema ===

export const TimeSliceSchema = z
  .object({
    time: z.number().int().nonnegative(),
    prepareNodes: z.array(z.string()),
    entangleEdges: z.array(z.string()),
    measureNodes: z.array(z.string()),
  })
  .strict();

export const ScheduleResultSchema = z
  .object({
    prepareTime: z.record(z.string(), z.number().nullable()),
    measureTime: z.record(z.string(), z.number().nullable()),
    entangleTime: z.record(z.string(), z.number().nullable()),
    timeline: z.array(TimeSliceSchema),
  })
  .strict();

// === Project Schemas ===

export const ProjectSchema = z
  .object({
    $schema: z.literal("graphqomb-studio/v1"),
    name: z.string(),
    dimension: z.union([z.literal(2), z.literal(3)]),
    nodes: z.array(GraphNodeSchema),
    edges: z.array(GraphEdgeSchema),
    flow: FlowDefinitionSchema,
    schedule: ScheduleResultSchema.optional(),
  })
  .strict();

export type Project = z.infer<typeof ProjectSchema>;

// API payload schema (without $schema and schedule)
export const ProjectPayloadSchema = ProjectSchema.omit({
  $schema: true,
  schedule: true,
});

export type ProjectPayload = z.infer<typeof ProjectPayloadSchema>;

// === Utility Functions ===

export function normalizeEdgeId(source: string, target: string): string {
  const [a, b] = [source, target].sort();
  return `${a}-${b}`;
}

export function createEdge(source: string, target: string): z.infer<typeof GraphEdgeSchema> {
  return {
    id: normalizeEdgeId(source, target),
    source,
    target,
  };
}

export function toPayload(project: Project): ProjectPayload {
  const { $schema: _, schedule: __, ...payload } = project;
  return payload;
}

// === Validation Helpers ===

export function validateProject(data: unknown): Project {
  return ProjectSchema.parse(data);
}

export function validatePayload(data: unknown): ProjectPayload {
  return ProjectPayloadSchema.parse(data);
}

export function safeValidateProject(data: unknown): { success: true; data: Project } | { success: false; error: z.ZodError } {
  const result = ProjectSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
