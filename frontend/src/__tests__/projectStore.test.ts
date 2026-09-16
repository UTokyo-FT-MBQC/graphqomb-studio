/** Project-store loading and detector tag alignment tests. */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import type { GraphQOMBProject } from "@/types";

function taggedProject(): GraphQOMBProject {
  return {
    $schema: "graphqomb-studio/v1",
    name: "Tagged detectors",
    nodes: [
      {
        id: "n0",
        coordinate: { x: 0, y: 0, z: 0 },
        role: "intermediate",
        measBasis: { type: "axis", axis: "X", sign: "PLUS" },
      },
      {
        id: "n1",
        coordinate: { x: 1, y: 0, z: 0 },
        role: "intermediate",
        measBasis: { type: "axis", axis: "X", sign: "PLUS" },
      },
    ],
    edges: [],
    flow: { xflow: {}, zflow: "auto" },
    ftqc: {
      parityCheckGroup: [["n0"], ["n1"]],
      parityCheckTags: ["type=flag", "custom"],
      logicalObservableGroup: {},
    },
  };
}

describe("projectStore initial Z slice", () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
    useUIStore.setState(useUIStore.getInitialState());
  });

  afterEach(() => {
    useProjectStore.getState().reset();
    localStorage.clear();
  });

  function projectAtZ(zLevels: number[]): GraphQOMBProject {
    const project = taggedProject();
    return {
      ...project,
      nodes: project.nodes.map((node, index) => ({
        ...node,
        coordinate: { ...node.coordinate, z: zLevels[index] ?? 0 },
      })),
    };
  }

  it.each([
    [5, 5],
    [-5, -5],
    [9, 5],
    [5, -5],
  ])("opens imported nodes at Z levels %i and %i on an occupied slice", (firstZ, secondZ) => {
    useProjectStore.getState().setProject(projectAtZ([firstZ, secondZ]));

    const { viewMode, currentZSlice } = useUIStore.getState();
    expect(viewMode).toBe("2d-slice");
    expect(currentZSlice).toBe(Math.min(firstZ, secondZ));
    expect(
      useProjectStore.getState().project.nodes.some((node) => node.coordinate.z === currentZSlice)
    ).toBe(true);
  });

  it("selects an occupied slice when restoring a persisted project", async () => {
    const project = projectAtZ([5, 5]);
    localStorage.setItem("graphqomb-project", JSON.stringify({ state: { project }, version: 0 }));

    await useProjectStore.persist.rehydrate();

    expect(useProjectStore.getState().project).toEqual(project);
    expect(useUIStore.getState().viewMode).toBe("2d-slice");
    expect(useUIStore.getState().currentZSlice).toBe(5);
  });

  it("resets the slice when replacing or clearing a project", () => {
    useProjectStore.getState().setProject(projectAtZ([5, 9]));
    useUIStore.getState().setZSlice(9);
    useProjectStore.getState().setProject(projectAtZ([-5, -5]));
    expect(useUIStore.getState().currentZSlice).toBe(-5);

    useProjectStore.getState().reset();
    expect(useUIStore.getState().currentZSlice).toBe(0);
    expect(useProjectStore.getState().project.nodes).toEqual([]);

    useUIStore.getState().setZSlice(9);
    useProjectStore.getState().setProject({ ...taggedProject(), nodes: [], ftqc: undefined });
    expect(useUIStore.getState().currentZSlice).toBe(0);
  });

  it("preserves the selected slice during normal edits", () => {
    useProjectStore.getState().setProject(projectAtZ([5, 9]));
    useUIStore.getState().setZSlice(7);

    useProjectStore.getState().setProjectName("Edited");
    useProjectStore.getState().updateNode("n0", { coordinate: { x: 1, y: 2, z: 3 } });

    expect(useUIStore.getState().currentZSlice).toBe(7);
  });
});

describe("projectStore detector tags", () => {
  afterEach(() => useProjectStore.getState().reset());

  it("keeps tags aligned when a parity group is removed", () => {
    useProjectStore.getState().setProject(taggedProject());

    useProjectStore.getState().removeParityCheckGroup(0);

    expect(useProjectStore.getState().project.ftqc).toEqual({
      parityCheckGroup: [["n1"]],
      parityCheckTags: ["custom"],
      logicalObservableGroup: {},
    });
  });

  it("keeps tags aligned when node removal drops a parity group", () => {
    useProjectStore.getState().setProject(taggedProject());

    useProjectStore.getState().removeNode("n0");

    expect(useProjectStore.getState().project.ftqc).toEqual({
      parityCheckGroup: [["n1"]],
      parityCheckTags: ["custom"],
      logicalObservableGroup: {},
    });
  });
});
