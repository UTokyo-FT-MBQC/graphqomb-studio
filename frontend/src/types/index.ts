/**
 * GraphQOMB Studio Type Definitions
 *
 * These types match the specification and are used throughout the frontend.
 * For validation, use the corresponding Zod schemas in @/schemas/project.ts
 */

// === Coordinates ===

export interface Coordinate {
  x: number;
  y: number;
  z: number;
}

// === Measurement Basis ===

export type Plane = "XY" | "YZ" | "XZ";
export type Axis = "X" | "Y" | "Z";
export type Sign = "PLUS" | "MINUS";

export interface PlannerMeasBasis {
  type: "planner";
  plane: Plane;
  angleCoeff: number; // a in 2πa (e.g., 0.25 = π/2)
}

export interface AxisMeasBasis {
  type: "axis";
  axis: Axis;
  sign: Sign;
}

export type MeasBasis = PlannerMeasBasis | AxisMeasBasis;

// Get the actual angle in radians from a measurement basis
export function getAngle(basis: MeasBasis): number {
  if (basis.type === "axis") {
    if (basis.axis === "Y") {
      return basis.sign === "PLUS" ? Math.PI / 2 : (3 * Math.PI) / 2;
    }
    return basis.sign === "PLUS" ? 0 : Math.PI;
  }
  return 2 * Math.PI * basis.angleCoeff;
}

// === Nodes ===

export type NodeRole = "input" | "output" | "intermediate";

export interface InputNode {
  id: string;
  coordinate: Coordinate;
  role: "input";
  measBasis: MeasBasis;
  qubitIndex: number;
}

export interface OutputNode {
  id: string;
  coordinate: Coordinate;
  role: "output";
  measBasis?: undefined;
  qubitIndex: number;
}

export interface IntermediateNode {
  id: string;
  coordinate: Coordinate;
  role: "intermediate";
  measBasis: MeasBasis;
  qubitIndex?: undefined;
}

export type GraphNode = InputNode | OutputNode | IntermediateNode;

// Type guards for nodes
export function isInputNode(node: GraphNode): node is InputNode {
  return node.role === "input";
}

export function isOutputNode(node: GraphNode): node is OutputNode {
  return node.role === "output";
}

export function isIntermediateNode(node: GraphNode): node is IntermediateNode {
  return node.role === "intermediate";
}

// === Edges ===

export interface GraphEdge {
  id: string; // Normalized ID (source-target sorted alphabetically)
  source: string;
  target: string;
}

// Normalize edge ID for consistent identification
export function normalizeEdgeId(source: string, target: string): string {
  const [a, b] = [source, target].sort();
  return `${a}-${b}`;
}

// Create an edge with normalized ID
export function createEdge(source: string, target: string): GraphEdge {
  return {
    id: normalizeEdgeId(source, target),
    source,
    target,
  };
}

// === Flow ===

export interface FlowDefinition {
  xflow: Record<string, string[]>; // nodeId -> correction targets
  zflow: Record<string, string[]> | "auto"; // "auto" = odd_neighbors auto-calculation
}

// === FTQC (Fault-Tolerant Quantum Computing) ===

export interface FTQCDefinition {
  parityCheckGroup: string[][]; // list of node ID groups for parity check
  logicalObservableGroup: Record<string, string[]>; // observable index -> target node IDs
}

export interface ResolvedFlow {
  xflow: Record<string, string[]>;
  zflow: Record<string, string[]>; // Always concrete values (auto is resolved)
}

// === Schedule (Backend computation result) ===

export interface TimeSlice {
  time: number;
  prepareNodes: string[];
  entangleEdges: string[]; // Normalized edgeIds
  measureNodes: string[];
}

export interface ScheduleResult {
  prepareTime: Record<string, number | null>; // nodeId -> time
  measureTime: Record<string, number | null>; // nodeId -> time
  entangleTime: Record<string, number | null>; // normalized edgeId -> time
  timeline: TimeSlice[];
}

// === Project ===

export interface GraphQOMBProject {
  $schema: "graphqomb-studio/v1";
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  flow: FlowDefinition;
  ftqc?: FTQCDefinition | undefined; // Optional FTQC configuration for fault-tolerant QC
  schedule?: ScheduleResult | undefined; // Added after backend computation (optional)
}

// API payload type (without $schema and schedule)
export type ProjectPayload = Omit<GraphQOMBProject, "$schema" | "schedule">;

// Convert Project to API payload
export function toPayload(project: GraphQOMBProject): ProjectPayload {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema, schedule, ...payload } = project;
  return payload;
}
