/**
 * GraphCanvas2D coordinate contract tests.
 */

import { GraphCanvas2D } from "@/components/canvas/GraphCanvas2D";
import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUIStore } from "@/stores/uiStore";
import type { GraphQOMBProject } from "@/types";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reactFlowState = vi.hoisted(() => ({
  fitView: vi.fn(),
  props: undefined as
    | {
        nodes: Array<{ id: string; position: { x: number; y: number } }>;
        edges: Array<{
          id: string;
          data?: {
            sourceCenter?: { x: number; y: number };
            targetCenter?: { x: number; y: number };
          };
        }>;
        nodeOrigin?: [number, number];
      }
    | undefined,
}));

vi.mock("@xyflow/react", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  return {
    Background: () => null,
    Controls: () => null,
    ReactFlow: (props: Record<string, unknown>) => {
      reactFlowState.props = props as typeof reactFlowState.props;
      return React.createElement(
        "div",
        { "data-testid": "react-flow" },
        props.children as React.ReactNode
      );
    },
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useEdgesState: <T,>(initialEdges: T[]) => [initialEdges, vi.fn(), vi.fn()],
    useNodes: () => [],
    useNodesState: <T,>(initialNodes: T[]) => [initialNodes, vi.fn(), vi.fn()],
    useReactFlow: () => ({
      fitView: reactFlowState.fitView,
      screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
    }),
    useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  };
});

vi.mock("@xyflow/react/dist/style.css", () => ({}));

vi.mock("@/components/canvas/CustomEdge", () => ({
  CustomEdge: () => null,
}));

vi.mock("@/components/canvas/CustomNode", () => ({
  CustomNode: () => null,
}));

vi.mock("@/components/canvas/FlowOverlay", () => ({
  FlowOverlay: () => null,
}));

vi.mock("@/components/canvas/GhostNode", () => ({
  GhostNode: () => null,
}));

vi.mock("@/components/canvas/TilingPreview2D", () => ({
  TilingPreview2D: () => null,
}));

vi.mock("@/hooks/useFTQCVisualization", () => ({
  useFTQCVisualization: () => ({ highlights: { nodes: new Map(), edges: new Map() } }),
}));

vi.mock("@/hooks/useTilingDrag", () => ({
  useTilingDrag: () => ({
    handleMouseDown: vi.fn(),
    handleMouseLeave: vi.fn(),
    handleMouseMove: vi.fn(),
    handleMouseUp: vi.fn(),
    isActive: false,
  }),
}));

function createProject(): GraphQOMBProject {
  return {
    $schema: "graphqomb-studio/v1",
    name: "Coordinate Project",
    nodes: [
      {
        id: "n0",
        coordinate: { x: 1, y: 2, z: 0 },
        role: "input",
        measBasis: { type: "planner", plane: "XY", angleCoeff: 0 },
        qubitIndex: 0,
      },
      {
        id: "n1",
        coordinate: { x: 3, y: 4, z: 0 },
        role: "output",
        qubitIndex: 0,
      },
    ],
    edges: [{ id: "n0-n1", source: "n0", target: "n1" }],
    flow: { xflow: {}, zflow: "auto" },
  };
}

describe("GraphCanvas2D", () => {
  beforeEach(() => {
    reactFlowState.fitView.mockReset();
    reactFlowState.props = undefined;
    useProjectStore.getState().setProject(createProject());
    useSelectionStore.getState().clearSelection();
    useUIStore.setState({ viewMode: "2d-projection", currentZSlice: 0, isTilingMode: false });
  });

  afterEach(() => {
    cleanup();
    useProjectStore.getState().reset();
  });

  it("passes centered node positions and center-based edge data to React Flow", async () => {
    render(<GraphCanvas2D />);

    await waitFor(() => {
      expect(reactFlowState.props).toBeDefined();
    });

    expect(reactFlowState.props?.nodeOrigin).toEqual([0.5, 0.5]);
    expect(reactFlowState.props?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "n0", position: { x: 100, y: 200 } }),
        expect.objectContaining({ id: "n1", position: { x: 300, y: 400 } }),
      ])
    );
    expect(reactFlowState.props?.edges).toEqual([
      expect.objectContaining({
        id: "n0-n1",
        data: expect.objectContaining({
          sourceCenter: { x: 100, y: 200 },
          targetCenter: { x: 300, y: 400 },
        }),
      }),
    ]);
  });

  it("fits the viewport after graph nodes are available", async () => {
    render(<GraphCanvas2D />);

    await waitFor(() => {
      expect(reactFlowState.fitView).toHaveBeenCalledWith({ padding: 0.2, duration: 200 });
    });
  });
});
