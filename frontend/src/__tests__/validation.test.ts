/**
 * Validation Tests
 *
 * Tests for Zod schema validation and project parsing.
 */

import { safeValidateProject } from "@/schemas/project";
import { describe, expect, it } from "vitest";

describe("Project validation", () => {
  it("should validate a minimal valid project", () => {
    const validProject = {
      $schema: "graphqomb-studio/v1",
      name: "Test Project",
      dimension: 2,
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
    const projectWithNodes = {
      $schema: "graphqomb-studio/v1",
      name: "Test Project",
      dimension: 2,
      nodes: [
        {
          id: "n0",
          coordinate: { x: 0, y: 0 },
          role: "input",
          qubitIndex: 0,
          measBasis: { type: "planner", plane: "XY", angleCoeff: 0 },
        },
        {
          id: "n1",
          coordinate: { x: 1, y: 0 },
          role: "output",
          qubitIndex: 0,
        },
      ],
      edges: [{ id: "n0-n1", source: "n0", target: "n1" }],
      flow: {
        xflow: {},
        zflow: "auto" as const,
      },
    };

    const result = safeValidateProject(projectWithNodes);
    expect(result.success).toBe(true);
  });

  it("should validate a project with intermediate node", () => {
    const projectWithIntermediate = {
      $schema: "graphqomb-studio/v1",
      name: "Test Project",
      dimension: 2,
      nodes: [
        {
          id: "n0",
          coordinate: { x: 0, y: 0 },
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

  it("should reject invalid dimension", () => {
    const invalidDimension = {
      $schema: "graphqomb-studio/v1",
      name: "Test Project",
      dimension: 4,
      nodes: [],
      edges: [],
      flow: {
        xflow: {},
        zflow: "auto" as const,
      },
    };

    const result = safeValidateProject(invalidDimension);
    expect(result.success).toBe(false);
  });
});
