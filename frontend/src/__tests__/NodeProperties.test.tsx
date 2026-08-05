/**
 * Node properties tests.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeProperties } from "@/components/panels/NodeProperties";
import { useProjectStore } from "@/stores/projectStore";
import type { GraphQOMBProject, InputNode } from "@/types";

function projectWithZInput(): GraphQOMBProject {
  return {
    $schema: "graphqomb-studio/v1",
    name: "PTN v2",
    nodes: [
      {
        id: "n0",
        coordinate: { x: 0, y: 0, z: 0 },
        role: "input",
        measBasis: { type: "axis", axis: "X", sign: "PLUS" },
        qubitIndex: 0,
        inputBasis: "Z",
      },
    ],
    edges: [],
    flow: { xflow: {}, zflow: "auto" },
  };
}

describe("NodeProperties", () => {
  beforeEach(() => {
    useProjectStore.getState().setProject(projectWithZInput());
  });

  afterEach(() => {
    cleanup();
    useProjectStore.getState().reset();
  });

  it("displays and updates an imported PTN v2 input basis", () => {
    const inputNode = useProjectStore.getState().project.nodes[0] as InputNode;
    render(<NodeProperties node={inputNode} />);

    const select = screen.getByLabelText("Input Basis");
    expect(select).toHaveValue("Z");

    fireEvent.change(select, { target: { value: "Y" } });

    expect(useProjectStore.getState().project.nodes[0]).toMatchObject({ inputBasis: "Y" });
  });
});
