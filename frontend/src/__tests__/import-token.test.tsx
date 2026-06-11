/**
 * CLI import token loading tests.
 */

import Home from "@/app/page";
import { useProjectStore } from "@/stores/projectStore";
import type { GraphQOMBProject } from "@/types";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/canvas/GraphCanvas2D", () => ({
  GraphCanvas2D: () => <div data-testid="graph-canvas-2d" />,
}));

vi.mock("@/components/canvas/GraphCanvas3D", () => ({
  GraphCanvas3D: () => <div data-testid="graph-canvas-3d" />,
}));

vi.mock("@/components/dialogs/Tiling3DDialog", () => ({
  Tiling3DDialog: () => null,
}));

vi.mock("@/components/panels/PropertyPanel", () => ({
  PropertyPanel: () => <div data-testid="property-panel" />,
}));

vi.mock("@/components/schedule", () => ({
  ScheduleEditor: () => null,
}));

vi.mock("@/components/timeline/TimelineView", () => ({
  TimelineView: () => null,
}));

vi.mock("@/components/toolbar/Toolbar", () => ({
  Toolbar: () => null,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function validProject(): GraphQOMBProject {
  return {
    $schema: "graphqomb-studio/v1",
    name: "Imported PTN",
    nodes: [
      {
        id: "n0",
        coordinate: { x: 0, y: 0, z: 0 },
        role: "input",
        measBasis: { type: "axis", axis: "X", sign: "PLUS" },
        qubitIndex: 0,
      },
      {
        id: "n1",
        coordinate: { x: 1, y: 0, z: 0 },
        role: "output",
        qubitIndex: 0,
      },
    ],
    edges: [{ id: "n0-n1", source: "n0", target: "n1" }],
    flow: { xflow: { n0: ["n1"] }, zflow: { n0: ["n0"] } },
  };
}

describe("CLI import token loading", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    useProjectStore.getState().reset();
    window.history.pushState(null, "", "/");
  });

  afterEach(() => {
    cleanup();
    window.history.pushState(null, "", "/");
  });

  it("loads an import session into the project store and removes the token", async () => {
    window.history.pushState(null, "", "/?importToken=abc123");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => validProject(),
    });

    render(<Home />);

    await waitFor(() => {
      expect(useProjectStore.getState().project.name).toBe("Imported PTN");
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/import-session/abc123"),
      expect.any(Object)
    );
    expect(window.location.search).toBe("");
  });

  it("shows an import error when the session cannot be loaded", async () => {
    window.history.pushState(null, "", "/?importToken=missing");
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ detail: "Import session not found" }),
    });

    render(<Home />);

    expect(await screen.findByText("Import failed: Import session not found")).toBeInTheDocument();
    expect(useProjectStore.getState().project.name).toBe("Untitled");
  });
});
