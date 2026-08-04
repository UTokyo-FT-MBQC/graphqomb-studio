/** Project-store detector tag alignment tests. */

import { useProjectStore } from "@/stores/projectStore";
import type { GraphQOMBProject } from "@/types";
import { afterEach, describe, expect, it } from "vitest";

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
