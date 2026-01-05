/**
 * Graph Canvas 2D Component
 *
 * Main canvas component using React Flow for 2D graph visualization.
 * Handles node/edge rendering, selection, and editing.
 * Supports Z-slice mode for 3D projects with ghost nodes.
 */

"use client";

import { CustomEdge } from "@/components/canvas/CustomEdge";
import type { CustomNodeData } from "@/components/canvas/CustomNode";
import { CustomNode } from "@/components/canvas/CustomNode";
import { FlowOverlay } from "@/components/canvas/FlowOverlay";
import { GhostNode, type GhostNodeData } from "@/components/canvas/GhostNode";

// Internal type for ghost node computation (includes position before converting to React Flow node)
interface GhostNodeComputedData {
  node: GraphNode;
  position: { x: number; y: number };
  zOffset: number;
}
import { SCALE, getAdjacentZNodes, getGhostPosition, getNodeZ } from "@/lib/geometry";
import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUIStore } from "@/stores/uiStore";
import type { Coordinate, GraphNode, IntermediateNode } from "@/types";
import { createEdge, is3D } from "@/types";
import {
  Background,
  Controls,
  type EdgeTypes,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import type { Connection, Edge, EdgeChange, Node, NodeChange } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef } from "react";

const nodeTypes: NodeTypes = {
  custom: CustomNode,
  ghost: GhostNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

// Convert graph node to React Flow node
function toFlowNode(node: GraphNode): Node<CustomNodeData> {
  const coord = node.coordinate;
  return {
    id: node.id,
    type: "custom",
    position: {
      x: coord.x * SCALE,
      y: coord.y * SCALE,
    },
    data: { node },
  };
}

// Convert ghost node data to React Flow node
function toGhostFlowNode(ghostData: GhostNodeComputedData): Node<GhostNodeData> {
  return {
    id: ghostData.node.id,
    type: "ghost",
    position: {
      x: ghostData.position.x * SCALE,
      y: ghostData.position.y * SCALE,
    },
    data: { node: ghostData.node, zOffset: ghostData.zOffset },
    draggable: false,
    selectable: false,
    connectable: true,
  };
}

// Convert React Flow position to graph coordinate
function toGraphCoordinate(x: number, y: number, is3DMode: boolean, z: number): Coordinate {
  const baseCoord = {
    x: Math.round((x / SCALE) * 100) / 100,
    y: Math.round((y / SCALE) * 100) / 100,
  };
  if (is3DMode) {
    return { ...baseCoord, z };
  }
  return baseCoord;
}

// Generate unique node ID
function generateNodeId(existingIds: string[]): string {
  let counter = 0;
  let id = `n${counter}`;
  while (existingIds.includes(id)) {
    counter++;
    id = `n${counter}`;
  }
  return id;
}

// Inner component that uses useReactFlow (must be inside ReactFlowProvider)
function GraphCanvas2DInner(): React.ReactNode {
  const project = useProjectStore((state) => state.project);
  const addNode = useProjectStore((state) => state.addNode);
  const updateNode = useProjectStore((state) => state.updateNode);
  const addEdgeToStore = useProjectStore((state) => state.addEdge);
  const removeNode = useProjectStore((state) => state.removeNode);
  const removeEdge = useProjectStore((state) => state.removeEdge);

  const selectedNodeId = useSelectionStore((state) => state.selectedNodeId);
  const selectedEdgeId = useSelectionStore((state) => state.selectedEdgeId);
  const selectNode = useSelectionStore((state) => state.selectNode);
  const selectEdge = useSelectionStore((state) => state.selectEdge);
  const clearSelection = useSelectionStore((state) => state.clearSelection);

  const currentZSlice = useUIStore((state) => state.currentZSlice);

  const { screenToFlowPosition } = useReactFlow();

  const is3DMode = project.dimension === 3;

  // Track if we're syncing from external state changes
  const isSyncing = useRef(false);

  // Filter nodes by current Z-slice in 3D mode
  const visibleNodes = useMemo(() => {
    if (!is3DMode) return project.nodes;
    return project.nodes.filter((node) => getNodeZ(node) === currentZSlice);
  }, [project.nodes, is3DMode, currentZSlice]);

  // Get ghost nodes from adjacent Z levels
  const ghostNodesData = useMemo((): GhostNodeComputedData[] => {
    if (!is3DMode) return [];

    const { above, below } = getAdjacentZNodes(project.nodes, currentZSlice);
    const ghostNodes: GhostNodeComputedData[] = [];

    for (const node of above) {
      const position = getGhostPosition(node, currentZSlice, project.nodes);
      if (position !== null) {
        ghostNodes.push({ node, position, zOffset: 1 });
      }
    }

    for (const node of below) {
      const position = getGhostPosition(node, currentZSlice, project.nodes);
      if (position !== null) {
        ghostNodes.push({ node, position, zOffset: -1 });
      }
    }

    return ghostNodes;
  }, [project.nodes, is3DMode, currentZSlice]);

  // Set of visible node IDs for edge filtering
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  // Set of ghost node IDs
  const ghostNodeIds = useMemo(
    () => new Set(ghostNodesData.map((g) => g.node.id)),
    [ghostNodesData]
  );

  // Convert project nodes/edges to React Flow format (including ghost nodes)
  const flowNodes = useMemo(() => {
    const regularNodes = visibleNodes.map(toFlowNode);
    const ghostNodes = ghostNodesData.map(toGhostFlowNode);
    return [...regularNodes, ...ghostNodes];
  }, [visibleNodes, ghostNodesData]);

  // Filter edges: show edges where both nodes are visible, or one is visible and one is ghost
  const flowEdges: Edge[] = useMemo(
    () =>
      project.edges
        .filter((edge) => {
          const sourceVisible = visibleNodeIds.has(edge.source);
          const targetVisible = visibleNodeIds.has(edge.target);
          const sourceGhost = ghostNodeIds.has(edge.source);
          const targetGhost = ghostNodeIds.has(edge.target);

          // Show edge if both visible, or one visible and one ghost
          return (
            (sourceVisible && targetVisible) ||
            (sourceVisible && targetGhost) ||
            (targetVisible && sourceGhost)
          );
        })
        .map((edge) => {
          // Check if this is a cross-Z edge (connects to ghost)
          const isCrossZ = ghostNodeIds.has(edge.source) || ghostNodeIds.has(edge.target);

          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: "custom",
            ...(isCrossZ ? { style: { strokeDasharray: "5,5", opacity: 0.5 } } : {}),
          };
        }),
    [project.edges, visibleNodeIds, ghostNodeIds]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Sync React Flow state with project store
  useEffect(() => {
    isSyncing.current = true;
    setNodes(flowNodes);
    setEdges(flowEdges);
    isSyncing.current = false;
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  // Handle node changes (position, selection)
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<CustomNodeData>>[]) => {
      onNodesChange(changes);

      // Skip updates when syncing from store
      if (isSyncing.current) return;

      for (const change of changes) {
        if (change.type === "position" && "position" in change && change.position !== undefined) {
          // Only update store when dragging ends
          if ("dragging" in change && change.dragging === false) {
            const is3DMode = project.dimension === 3;
            const existingNode = project.nodes.find((n) => n.id === change.id);
            const currentZ =
              existingNode !== undefined && is3D(existingNode.coordinate)
                ? existingNode.coordinate.z
                : 0;

            updateNode(change.id, {
              coordinate: toGraphCoordinate(
                change.position.x,
                change.position.y,
                is3DMode,
                currentZ
              ),
            });
          }
        } else if (change.type === "select" && "selected" in change) {
          if (change.selected === true) {
            selectNode(change.id);
          }
        } else if (change.type === "remove") {
          removeNode(change.id);
        }
      }
    },
    [onNodesChange, project.dimension, project.nodes, updateNode, selectNode, removeNode]
  );

  // Handle edge changes (selection, removal)
  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      onEdgesChange(changes);

      // Skip updates when syncing from store
      if (isSyncing.current) return;

      for (const change of changes) {
        if (change.type === "select" && "selected" in change) {
          if (change.selected === true) {
            selectEdge(change.id);
          }
        } else if (change.type === "remove") {
          removeEdge(change.id);
        }
      }
    },
    [onEdgesChange, selectEdge, removeEdge]
  );

  // Handle new edge connection
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (
        connection.source !== null &&
        connection.target !== null &&
        connection.source !== connection.target
      ) {
        const edge = createEdge(connection.source, connection.target);
        addEdgeToStore(edge);
      }
    },
    [addEdgeToStore]
  );

  // Handle double-click to add new node (using screenToFlowPosition for correct pan/zoom handling)
  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // Use screenToFlowPosition to correctly convert screen coordinates
      // accounting for pan and zoom
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const existingIds = project.nodes.map((n) => n.id);
      const newId = generateNodeId(existingIds);

      // Use currentZSlice for new nodes in 3D mode
      const coordinate = toGraphCoordinate(flowPosition.x, flowPosition.y, is3DMode, currentZSlice);

      // Create new intermediate node with default measurement basis
      const newNode: IntermediateNode = {
        id: newId,
        coordinate,
        role: "intermediate",
        measBasis: {
          type: "planner",
          plane: "XY",
          angleCoeff: 0,
        },
      };

      addNode(newNode);
      selectNode(newId);
    },
    [project.nodes, is3DMode, currentZSlice, addNode, selectNode, screenToFlowPosition]
  );

  // Handle pane click to clear selection
  const handlePaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Update selected state in nodes/edges
  const nodesWithSelection = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      })),
    [nodes, selectedNodeId]
  );

  const edgesWithSelection = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        selected: edge.id === selectedEdgeId,
      })),
    [edges, selectedEdgeId]
  );

  return (
    <ReactFlow
      nodes={nodesWithSelection}
      edges={edgesWithSelection}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
      onPaneClick={handlePaneClick}
      onDoubleClick={handlePaneDoubleClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      snapToGrid
      snapGrid={[10, 10]}
      deleteKeyCode={["Backspace", "Delete"]}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} size={1} />
      <Controls />
      <FlowOverlay />
    </ReactFlow>
  );
}

// Outer component that provides ReactFlowProvider context
export function GraphCanvas2D(): React.ReactNode {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <GraphCanvas2DInner />
      </ReactFlowProvider>
    </div>
  );
}
