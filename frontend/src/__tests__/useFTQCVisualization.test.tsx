/** FTQC original/compiled visualization tests. */

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFTQCVisualization } from "@/hooks/useFTQCVisualization";
import { compileFTQC } from "@/lib/api";
import { useCompiledFTQCStore } from "@/stores/compiledFTQCStore";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import type { GraphQOMBProject } from "@/types";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, compileFTQC: vi.fn() };
});

const mockCompileFTQC = vi.mocked(compileFTQC);

function createProject(): GraphQOMBProject {
  return {
    $schema: "graphqomb-studio/v1",
    name: "FTQC visualization",
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
        role: "intermediate",
        measBasis: { type: "axis", axis: "Y", sign: "PLUS" },
      },
      {
        id: "n2",
        coordinate: { x: 2, y: 0, z: 0 },
        role: "output",
        qubitIndex: 0,
      },
    ],
    edges: [
      { id: "n0-n1", source: "n0", target: "n1" },
      { id: "n1-n2", source: "n1", target: "n2" },
    ],
    flow: {
      xflow: { n0: ["n1"], n1: ["n2"] },
      zflow: { n0: ["n0"], n1: ["n1"] },
    },
    ftqc: {
      parityCheckGroup: [["n1"]],
      logicalObservableGroup: { "0": ["n1"] },
    },
  };
}

describe("useFTQCVisualization", () => {
  afterEach(() => {
    cleanup();
    mockCompileFTQC.mockReset();
    useCompiledFTQCStore.getState().clear();
    useProjectStore.getState().reset();
    useUIStore.getState().setFTQCDisplayMode("original");
    useUIStore.getState().setShowParityGroups(false);
    useUIStore.getState().setShowLogicalObservables(false);
  });

  it("switches canvas highlights from original seeds to compiled closure groups", async () => {
    useProjectStore.getState().setProject(createProject());
    useUIStore.getState().setShowParityGroups(true);
    useUIStore.getState().setShowLogicalObservables(true);
    mockCompileFTQC.mockResolvedValueOnce({
      parityCheckGroup: [["n0", "n1"]],
      logicalObservableGroup: { "0": ["n0", "n1"] },
    });
    const { result } = renderHook(() => ({
      canvas: useFTQCVisualization(),
      list: useFTQCVisualization(),
    }));

    expect([...result.current.canvas.highlights.keys()]).toEqual(["n1"]);

    act(() => useUIStore.getState().setFTQCDisplayMode("compiled"));

    await waitFor(() => expect(mockCompileFTQC).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(result.current.list.displayedFTQC).toEqual({
        parityCheckGroup: [["n0", "n1"]],
        logicalObservableGroup: { "0": ["n0", "n1"] },
      })
    );
    expect([...result.current.canvas.highlights.keys()]).toEqual(["n0", "n1"]);
  });
});
