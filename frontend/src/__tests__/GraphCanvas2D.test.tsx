/**
 * GraphCanvas2D coordinate contract tests.
 */

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { getNodesBounds, getViewportForBounds } from "@xyflow/react";
import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest";
import { GraphCanvas2D } from "@/components/canvas/GraphCanvas2D";
import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUIStore } from "@/stores/uiStore";
import type { GraphQOMBProject } from "@/types";

const reactFlowState = vi.hoisted(() => ({
  fitView: vi.fn(),
  width: 1000,
  height: 600,
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
        minZoom: number;
        maxZoom: number;
      }
    | undefined,
}));

vi.mock("@xyflow/react", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  const actual = await vi.importActual<typeof import("@xyflow/react")>("@xyflow/react");

  return {
    ...actual,
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
    useStore: (selector: (state: { width: number; height: number }) => unknown) =>
      selector(reactFlowState),
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

function getReactFlowProps() {
  assert.isDefined(reactFlowState.props);
  return reactFlowState.props;
}

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
    reactFlowState.width = 1000;
    reactFlowState.height = 600;
    useProjectStore.getState().setProject(createProject());
    useSelectionStore.getState().clearSelection();
    useUIStore.setState({
      viewMode: "2d-projection",
      currentZSlice: 0,
      ghostZRange: 1,
      isTilingMode: false,
    });
  });

  afterEach(async () => {
    cleanup();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
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

  it.each([
    [1000, 0],
    [0, 1000],
    [1000000, 1000000],
  ])("allows the entire graph spanning (%s, %s) to fit", (x, y) => {
    const project = createProject();
    project.nodes = project.nodes.map((node, index) => ({
      ...node,
      coordinate: { x: index === 0 ? -x : x, y: index === 0 ? -y : y, z: 0 },
    }));
    project.edges = [];
    useProjectStore.getState().setProject(project);
    render(<GraphCanvas2D />);

    const { nodes, nodeOrigin, minZoom, maxZoom } = getReactFlowProps();
    assert.isDefined(nodeOrigin);
    const bounds = getNodesBounds(
      nodes.map((node) => ({ ...node, data: {}, width: 32, height: 32 })),
      { nodeOrigin }
    );
    // Exercise React Flow's actual fit calculation with the configured limits.
    const viewport = getViewportForBounds(bounds, 1000, 600, minZoom, maxZoom, 0.2);
    expect(viewport.zoom).toBeLessThan(0.5);
    expect(viewport.x + bounds.x * viewport.zoom).toBeGreaterThanOrEqual(0);
    expect(viewport.y + bounds.y * viewport.zoom).toBeGreaterThanOrEqual(0);
    expect(viewport.x + (bounds.x + bounds.width) * viewport.zoom).toBeLessThanOrEqual(1000);
    expect(viewport.y + (bounds.y + bounds.height) * viewport.zoom).toBeLessThanOrEqual(600);
  });

  it("allows a few-unit detail view and adapts to canvas resizing", () => {
    reactFlowState.width = 2400;
    reactFlowState.height = 1500;
    const { rerender } = render(<GraphCanvas2D />);

    const { minZoom: initialMinZoom, maxZoom } = getReactFlowProps();
    expect(maxZoom).toBeGreaterThan(2);
    expect(1500 / (100 * maxZoom)).toBeLessThanOrEqual(3);

    reactFlowState.width = 200;
    reactFlowState.height = 150;
    rerender(<GraphCanvas2D />);

    expect(getReactFlowProps().minZoom).toBeLessThan(initialMinZoom);
    expect(getReactFlowProps().minZoom).toBeGreaterThan(0);
    expect(getReactFlowProps().maxZoom).toBeGreaterThanOrEqual(2);
  });

  it("keeps finite positive zoom limits before sizing an empty canvas", () => {
    useProjectStore.getState().setProject({ ...createProject(), nodes: [], edges: [] });
    reactFlowState.width = 0;
    reactFlowState.height = 0;
    render(<GraphCanvas2D />);

    const { minZoom, maxZoom } = getReactFlowProps();
    expect(minZoom).toBeGreaterThan(0);
    expect(Number.isFinite(maxZoom)).toBe(true);
    expect(maxZoom).toBeGreaterThan(minZoom);
  });

  it("preserves the viewport when the z slice changes", async () => {
    const project = createProject();
    project.nodes.push({
      id: "n2",
      coordinate: { x: 5, y: 6, z: 1 },
      role: "output",
      qubitIndex: 1,
    });
    useProjectStore.getState().setProject(project);
    useUIStore.setState({ viewMode: "2d-slice", currentZSlice: 0, ghostZRange: 0 });

    render(<GraphCanvas2D />);

    await waitFor(() => {
      expect(reactFlowState.fitView).toHaveBeenCalledTimes(1);
    });
    reactFlowState.fitView.mockClear();
    const { minZoom: initialMinZoom, maxZoom: initialMaxZoom } = getReactFlowProps();

    act(() => {
      useUIStore.getState().setZSlice(1);
    });

    await waitFor(() => {
      expect(reactFlowState.props?.nodes.map((node) => node.id)).toEqual(["n2"]);
    });
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });

    expect(reactFlowState.fitView).not.toHaveBeenCalled();
    expect(getReactFlowProps().minZoom).toBe(initialMinZoom);
    expect(getReactFlowProps().maxZoom).toBe(initialMaxZoom);
  });

  it("preserves the viewport when a hidden node is added", async () => {
    useUIStore.setState({ viewMode: "2d-slice", currentZSlice: 0, ghostZRange: 0 });

    render(<GraphCanvas2D />);

    await waitFor(() => {
      expect(reactFlowState.fitView).toHaveBeenCalledTimes(1);
    });
    reactFlowState.fitView.mockClear();

    act(() => {
      useProjectStore.getState().addNode({
        id: "n2",
        coordinate: { x: 5, y: 6, z: 2 },
        role: "output",
        qubitIndex: 1,
      });
    });

    await waitFor(() => {
      expect(useProjectStore.getState().project.nodes).toHaveLength(3);
      expect(reactFlowState.props?.nodes.map((node) => node.id)).toEqual(["n0", "n1"]);
    });
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });

    expect(reactFlowState.fitView).not.toHaveBeenCalled();
  });
});
