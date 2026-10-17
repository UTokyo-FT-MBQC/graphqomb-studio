/** PTN v5 Clifford-flow persistence, editing, and visualization regressions. */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlowOverlay } from "@/components/canvas/FlowOverlay";
import { FlowEditor } from "@/components/panels/FlowEditor";
import { ViewControls } from "@/components/toolbar/ViewControls";
import { parseProject, serializeProject } from "@/lib/validation";
import { safeValidateProject } from "@/schemas/project";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { type GraphQOMBProject, toPayload } from "@/types";

vi.mock("@xyflow/react", () => ({
  Panel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useNodes: () => [
    { id: "n0", position: { x: 0, y: 0 } },
    { id: "n1", position: { x: 100, y: 0 } },
  ],
  useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
}));

function cliffordProject(): GraphQOMBProject {
  return {
    $schema: "graphqomb-studio/v1",
    name: "Clifford feedforward",
    nodes: [
      {
        id: "n0",
        coordinate: { x: 0, y: 0, z: 0 },
        role: "intermediate",
        measBasis: { type: "axis", axis: "X", sign: "PLUS" },
      },
      { id: "n1", coordinate: { x: 1, y: 0, z: 0 }, role: "output", qubitIndex: 0 },
    ],
    edges: [{ id: "n0-n1", source: "n0", target: "n1" }],
    flow: { xflow: {}, zflow: {}, cflow: { n0: { n1: "SH" } } },
    schedule: {
      prepareTime: { n0: 0, n1: 0 },
      measureTime: { n0: 1 },
      entangleTime: { "n0-n1": 0 },
      timeline: [],
    },
  };
}

beforeEach(() => {
  useProjectStore.getState().setProject(cliffordProject());
  useUIStore.setState(useUIStore.getInitialState());
});

afterEach(() => {
  cleanup();
  useProjectStore.getState().reset();
  localStorage.clear();
});

describe("Clifford-flow project data", () => {
  it("preserves correcting gates through JSON and API payload conversion", () => {
    const restored = parseProject(serializeProject(cliffordProject()));
    expect(restored.flow.cflow).toEqual({ n0: { n1: "SH" } });
    expect(toPayload(restored).flow.cflow).toEqual({ n0: { n1: "SH" } });
  });

  it.each([{ missing: { n1: "H" } }, { n0: { missing: "H" } }, { n0: { n1: "X" } }])(
    "rejects invalid cflow references or gates: %j",
    (cflow) => {
      const project = cliffordProject();
      const result = safeValidateProject({ ...project, flow: { ...project.flow, cflow } });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.some((issue) => issue.path.includes("cflow"))).toBe(true);
    }
  );

  it("removes deleted sources and targets while preserving other corrections", () => {
    useProjectStore
      .getState()
      .updateFlow({ xflow: {}, zflow: {}, cflow: { n0: { n0: "H", n1: "S" }, n1: { n0: "HS" } } });
    useProjectStore.getState().removeNode("n1");
    expect(useProjectStore.getState().project.flow.cflow).toEqual({ n0: { n0: "H" } });
    expect(useProjectStore.getState().project.schedule).toBeUndefined();
    useProjectStore.getState().removeNode("n0");
    expect(useProjectStore.getState().project.flow.cflow).toEqual({});
  });
});

describe("Clifford-flow editor", () => {
  it("edits an imported gate, invalidates the schedule, removes it, and adds an output target", () => {
    render(<FlowEditor nodeId="n0" />);
    const gate = screen.getByLabelText("C-Flow gate for n1");
    expect(gate).toHaveValue("SH");
    fireEvent.change(gate, { target: { value: "HS" } });
    expect(useProjectStore.getState().project.flow.cflow).toEqual({ n0: { n1: "HS" } });
    expect(useProjectStore.getState().project.schedule).toBeUndefined();

    fireEvent.click(screen.getByLabelText("Remove C-Flow n1"));
    expect(useProjectStore.getState().project.flow.cflow).toEqual({});
    fireEvent.change(screen.getByLabelText("New C-Flow gate"), { target: { value: "HSH" } });
    fireEvent.change(screen.getByLabelText("C-Flow target"), { target: { value: "n1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add C-Flow target" }));
    expect(useProjectStore.getState().project.flow.cflow).toEqual({ n0: { n1: "HSH" } });
  });
});

describe("Clifford-flow visualization", () => {
  it("toggles C-Flow independently of Pauli-flow visibility", () => {
    render(<ViewControls />);
    fireEvent.click(screen.getByRole("checkbox", { name: "C-Flow" }));
    expect(useUIStore.getState().showCFlow).toBe(true);
    expect(useUIStore.getState().showXFlow).toBe(false);
    expect(useUIStore.getState().showZFlow).toBe(false);
  });

  it("shows correcting gates and self-loops when only C-Flow is enabled", () => {
    useProjectStore
      .getState()
      .updateFlow({ xflow: {}, zflow: {}, cflow: { n0: { n1: "SH", n0: "S" } } });
    useUIStore.getState().setShowCFlow(true);
    render(<FlowOverlay />);
    const correction = screen.getByLabelText("C-Flow n0 to n1: SH");
    const selfCorrection = screen.getByLabelText("C-Flow n0 to n0: S");
    expect(correction.querySelector("text")).toHaveTextContent("SH");
    expect(correction.querySelector("path")).toHaveAttribute("stroke", "#a855f7");
    expect(selfCorrection.querySelector("path")?.getAttribute("d")).toContain("C");
    act(() => useUIStore.getState().setShowCFlow(false));
    expect(
      screen.queryByRole("img", { name: "Flow visualization arrows" })
    ).not.toBeInTheDocument();
  });
});
