/**
 * Validation Tests
 *
 * Tests for Zod schema validation and project parsing.
 */

import { safeValidateProject } from "@/schemas/project";
import type { GraphQOMBProject } from "@/types";
import { describe, expect, it } from "vitest";

function createValidProjectWithNodes(): GraphQOMBProject {
  return {
    $schema: "graphqomb-studio/v1",
    name: "Test Project",
    nodes: [
      {
        id: "n0",
        coordinate: { x: 0, y: 0, z: 0 },
        role: "input",
        qubitIndex: 0,
        measBasis: { type: "planner", plane: "XY", angleCoeff: 0 },
      },
      {
        id: "n1",
        coordinate: { x: 1, y: 0, z: 0 },
        role: "output",
        qubitIndex: 0,
      },
    ],
    edges: [{ id: "n0-n1", source: "n0", target: "n1" }],
    flow: {
      xflow: { n0: ["n1"] },
      zflow: "auto" as const,
    },
  };
}

describe("Project validation", () => {
  it("should validate a minimal valid project", () => {
    const validProject = {
      $schema: "graphqomb-studio/v1",
      name: "Test Project",
      nodes: [],
      edges: [],
      flow: {
        xflow: {},
        zflow: "auto" as const,
      },
    };

    const result = safeValidateProject(validProject);
    expect(result.success).toBe(true);
  });

  it("should reject invalid project without required fields", () => {
    const invalidProject = {
      name: "Missing fields",
    };

    const result = safeValidateProject(invalidProject);
    expect(result.success).toBe(false);
  });

  it("should validate a project with nodes", () => {
    const projectWithNodes = createValidProjectWithNodes();

    const result = safeValidateProject(projectWithNodes);
    expect(result.success).toBe(true);
  });

  it("should validate a project with intermediate node", () => {
    const projectWithIntermediate = {
      $schema: "graphqomb-studio/v1",
      name: "Test Project",
      nodes: [
        {
          id: "n0",
          coordinate: { x: 0, y: 0, z: 0 },
          role: "intermediate",
          measBasis: { type: "axis", axis: "X", sign: "PLUS" },
        },
      ],
      edges: [],
      flow: {
        xflow: {},
        zflow: "auto" as const,
      },
    };

    const result = safeValidateProject(projectWithIntermediate);
    expect(result.success).toBe(true);
  });

  it("should validate a measured output node", () => {
    const project = createValidProjectWithNodes();
    project.nodes[1] = {
      id: "n1",
      coordinate: { x: 1, y: 0, z: 0 },
      role: "output",
      qubitIndex: 0,
      measBasis: { type: "axis", axis: "X", sign: "PLUS" },
    };

    const result = safeValidateProject(project);
    expect(result.success).toBe(true);
  });

  it("should validate a project with fractional Z coordinates", () => {
    const projectWithFractionalZ = {
      $schema: "graphqomb-studio/v1",
      name: "Test Project",
      nodes: [
        {
          id: "n0",
          coordinate: { x: 0, y: 0, z: 0.5 },
          role: "intermediate",
          measBasis: { type: "planner", plane: "XY", angleCoeff: 0 },
        },
        {
          id: "n1",
          coordinate: { x: 1, y: 0, z: -0.3 },
          role: "intermediate",
          measBasis: { type: "planner", plane: "XY", angleCoeff: 0 },
        },
      ],
      edges: [],
      flow: {
        xflow: {},
        zflow: "auto" as const,
      },
    };

    const result = safeValidateProject(projectWithFractionalZ);
    expect(result.success).toBe(true);
  });

  it("should reject duplicate node IDs", () => {
    const project = createValidProjectWithNodes();
    project.nodes.push({
      id: "n0",
      coordinate: { x: 2, y: 0, z: 0 },
      role: "intermediate",
      measBasis: { type: "planner", plane: "XY", angleCoeff: 0 },
    });

    const result = safeValidateProject(project);
    expect(result.success).toBe(false);
  });

  it("should reject edges that reference unknown nodes", () => {
    const project = createValidProjectWithNodes();
    project.edges = [{ id: "n0-n2", source: "n0", target: "n2" }];

    const result = safeValidateProject(project);
    expect(result.success).toBe(false);
  });

  it("should reject self-edges", () => {
    const project = createValidProjectWithNodes();
    project.edges = [{ id: "n0-n0", source: "n0", target: "n0" }];

    const result = safeValidateProject(project);
    expect(result.success).toBe(false);
  });

  it("should reject xflow references to unknown nodes", () => {
    const project = createValidProjectWithNodes();
    project.flow = {
      xflow: { n0: ["n2"] },
      zflow: "auto" as const,
    };

    const result = safeValidateProject(project);
    expect(result.success).toBe(false);
  });

  it("should reject xflow entries for unknown source nodes", () => {
    const project = createValidProjectWithNodes();
    project.flow = {
      xflow: { n2: ["n1"] },
      zflow: "auto" as const,
    };

    const result = safeValidateProject(project);
    expect(result.success).toBe(false);
  });

  it("should reject manual zflow references to unknown nodes", () => {
    const project = createValidProjectWithNodes();
    project.flow = {
      xflow: { n0: ["n1"] },
      zflow: { n0: ["n2"] },
    };

    const result = safeValidateProject(project);
    expect(result.success).toBe(false);
  });

  it("should reject manual zflow entries for unknown source nodes", () => {
    const project = createValidProjectWithNodes();
    project.flow = {
      xflow: { n0: ["n1"] },
      zflow: { n2: ["n1"] },
    };

    const result = safeValidateProject(project);
    expect(result.success).toBe(false);
  });
});
