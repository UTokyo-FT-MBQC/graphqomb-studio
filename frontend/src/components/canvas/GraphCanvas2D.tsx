/**
 * Graph Canvas 2D Component
 *
 * Main canvas component using React Flow for 2D graph visualization.
 * Handles node/edge rendering, selection, and editing.
 */

"use client";

import type { CustomNodeData } from "@/components/canvas/CustomNode";
import { CustomEdge } from "@/components/canvas/CustomEdge";
import { CustomNode } from "@/components/canvas/CustomNode";
import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import type { Coordinate, GraphNode, IntermediateNode } from "@/types";
import { createEdge, is3D } from "@/types";
import {
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import type { Connection, Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef } from "react";

// Scale factor for converting graph coordinates to canvas pixels
const SCALE = 100;

const nodeTypes: NodeTypes = {
  custom: CustomNode,
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

export function GraphCanvas2D(): React.ReactNode {
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

  // Track if we're syncing from external state changes
  const isSyncing = useRef(false);

  // Convert project nodes/edges to React Flow format
  const flowNodes = useMemo(() => project.nodes.map(toFlowNode), [project.nodes]);
  const flowEdges: Edge[] = useMemo(
    () =>
      project.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "custom",
      })),
    [project.edges]
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (changes: any[]) => {
      onNodesChange(changes);

      // Skip updates when syncing from store
      if (isSyncing.current) return;

      for (const change of changes) {
        if (change.type === "position" && change.position !== undefined && change.dragging === false) {
          const is3DMode = project.dimension === 3;
          const existingNode = project.nodes.find((n) => n.id === change.id);
          const currentZ = existingNode !== undefined && is3D(existingNode.coordinate) ? existingNode.coordinate.z : 0;

          updateNode(change.id, {
            coordinate: toGraphCoordinate(change.position.x, change.position.y, is3DMode, currentZ),
          });
        } else if (change.type === "select") {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (changes: any[]) => {
      onEdgesChange(changes);

      // Skip updates when syncing from store
      if (isSyncing.current) return;

      for (const change of changes) {
        if (change.type === "select") {
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
      if (connection.source !== null && connection.target !== null && connection.source !== connection.target) {
        const edge = createEdge(connection.source, connection.target);
        addEdgeToStore(edge);
      }
    },
    [addEdgeToStore]
  );

  // Handle double-click to add new node
  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      const bounds = target.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;

      const existingIds = project.nodes.map((n) => n.id);
      const newId = generateNodeId(existingIds);

      const is3DMode = project.dimension === 3;
      const coordinate = toGraphCoordinate(x, y, is3DMode, 0);

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
    [project.nodes, project.dimension, addNode, selectNode]
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
    <div className="w-full h-full">
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
      </ReactFlow>
    </div>
  );
}
