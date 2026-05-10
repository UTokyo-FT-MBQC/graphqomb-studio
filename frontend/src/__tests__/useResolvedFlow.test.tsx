/**
 * useResolvedFlow tests.
 */

import { useResolvedFlow } from "@/hooks/useResolvedFlow";
import { computeZFlow } from "@/lib/api";
import { useProjectStore } from "@/stores/projectStore";
import { useResolvedFlowStore } from "@/stores/resolvedFlowStore";
import type { GraphQOMBProject } from "@/types";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  computeZFlow: vi.fn(),
}));

const mockComputeZFlow = vi.mocked(computeZFlow);

function createProject(): GraphQOMBProject {
  return {
    $schema: "graphqomb-studio/v1",
    name: "Flow Project",
    nodes: [
      {
        id: "n0",
        coordinate: { x: 0, y: 0, z: 0 },
        role: "input",
        measBasis: { type: "planner", plane: "XY", angleCoeff: 0 },
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
    flow: { xflow: { n0: ["n1"] }, zflow: "auto" },
  };
}

describe("useResolvedFlow", () => {
  afterEach(() => {
    cleanup();
    mockComputeZFlow.mockReset();
    useResolvedFlowStore.getState().clear();
    useProjectStore.getState().reset();
  });

  it("does not auto-fetch when disabled", async () => {
    useProjectStore.getState().setProject(createProject());

    renderHook(() => useResolvedFlow(false));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockComputeZFlow).not.toHaveBeenCalled();
  });

  it("auto-fetches when enabled", async () => {
    useProjectStore.getState().setProject(createProject());
    mockComputeZFlow.mockResolvedValueOnce({ n0: ["n1"] });

    const { result } = renderHook(() => useResolvedFlow(true));

    await waitFor(() => expect(mockComputeZFlow).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.resolvedFlow?.zflow).toEqual({ n0: ["n1"] }));
  });

  it("refresh fetches even when disabled", async () => {
    useProjectStore.getState().setProject(createProject());
    mockComputeZFlow.mockResolvedValueOnce({ n0: ["n1"] });

    const { result } = renderHook(() => useResolvedFlow(false));
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(mockComputeZFlow).toHaveBeenCalledTimes(1));
  });
});
