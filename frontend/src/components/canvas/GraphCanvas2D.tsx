/**
 * Graph Canvas 2D Component
 *
 * Main canvas component using React Flow for 2D graph visualization.
 * Handles node/edge rendering, selection, and editing.
 * Supports multiple view modes:
 * - 2d-projection: Show all nodes projected to XY plane
 * - 2d-slice: Show nodes at current Z-slice with ghost nodes
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
import { type EdgeWithPosition, calculateEdgeOffsets } from "@/lib/edgeUtils";
import { SCALE, getGhostCandidateNodes, getGhostPosition } from "@/lib/geometry";
import { useEdgeCreationStore } from "@/stores/edgeCreationStore";
import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUIStore } from "@/stores/uiStore";
import type { Coordinate, GraphNode, IntermediateNode } from "@/types";
import { createEdge } from "@/types";
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

// Convert React Flow position to graph coordinate (always 3D)
function toGraphCoordinate(x: number, y: number, z: number): Coordinate {
  return {
    x: Math.round((x / SCALE) * 100) / 100,
    y: Math.round((y / SCALE) * 100) / 100,
    z,
  };
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

  const viewMode = useUIStore((state) => state.viewMode);
  const currentZSlice = useUIStore((state) => state.currentZSlice);
  const ghostZRange = useUIStore((state) => state.ghostZRange);

  const isEdgeCreationMode = useEdgeCreationStore((state) => state.isEdgeCreationMode);
  const sourceNodeId = useEdgeCreationStore((state) => state.sourceNodeId);
  const setSourceNode = useEdgeCreationStore((state) => state.setSourceNode);
  const clearSourceNode = useEdgeCreationStore((state) => state.clearSourceNode);

  const { screenToFlowPosition } = useReactFlow();

  // Track if we're syncing from external state changes
  const isSyncing = useRef(false);

  // Filter nodes based on view mode
  const visibleNodes = useMemo(() => {
    if (viewMode === "2d-projection") {
      // Projection mode: show all nodes
      return project.nodes;
    }
    // 2d-slice mode: filter by Z (exact match)
    return project.nodes.filter((node) => node.coordinate.z === currentZSlice);
  }, [project.nodes, viewMode, currentZSlice]);

  // Get ghost nodes (only in 2d-slice mode, where |Z diff| <= ghostZRange)
  const ghostNodesData = useMemo((): GhostNodeComputedData[] => {
    if (viewMode !== "2d-slice") return [];

    const ghostCandidates = getGhostCandidateNodes(project.nodes, currentZSlice, ghostZRange);
    const ghostNodes: GhostNodeComputedData[] = [];

    for (const node of ghostCandidates) {
      const position = getGhostPosition(node, currentZSlice, project.nodes, ghostZRange);
      if (position !== null) {
        const zOffset = node.coordinate.z - currentZSlice;
        ghostNodes.push({ node, position, zOffset });
      }
    }

    return ghostNodes;
  }, [project.nodes, viewMode, currentZSlice, ghostZRange]);

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

  // Build node position map for offset calculation
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();

    // Add visible nodes
    for (const node of visibleNodes) {
      positions.set(node.id, {
        x: node.coordinate.x * SCALE,
        y: node.coordinate.y * SCALE,
      });
    }

    // Add ghost nodes
    for (const ghost of ghostNodesData) {
      positions.set(ghost.node.id, {
        x: ghost.position.x * SCALE,
        y: ghost.position.y * SCALE,
      });
    }

    return positions;
  }, [visibleNodes, ghostNodesData]);

  // Filter edges based on view mode
  const flowEdges: Edge[] = useMemo(() => {
    let filteredEdges = project.edges;

    // In 2d-slice mode, filter edges by visible/ghost nodes
    if (viewMode === "2d-slice") {
      filteredEdges = project.edges.filter((edge) => {
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
      });
    }

    // Build edges with position info for offset calculation
    const edgesWithPositions: EdgeWithPosition[] = [];
    for (const edge of filteredEdges) {
      const sourcePos = nodePositions.get(edge.source);
      const targetPos = nodePositions.get(edge.target);

      if (sourcePos !== undefined && targetPos !== undefined) {
        edgesWithPositions.push({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          position: {
            sourceX: sourcePos.x,
            sourceY: sourcePos.y,
            targetX: targetPos.x,
            targetY: targetPos.y,
          },
        });
      }
    }

    // Calculate offsets for overlapping edges
    const offsets = calculateEdgeOffsets(edgesWithPositions);

    // Map to final edge format with offset data
    return filteredEdges.map((edge) => {
      const isCrossZ = ghostNodeIds.has(edge.source) || ghostNodeIds.has(edge.target);
      const offset = offsets.get(edge.id) ?? 0;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "custom",
        data: { offset },
        ...(isCrossZ ? { style: { strokeDasharray: "5,5", opacity: 0.5 } } : {}),
      };
    });
  }, [project.edges, viewMode, visibleNodeIds, ghostNodeIds, nodePositions]);

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
            const existingNode = project.nodes.find((n) => n.id === change.id);
            const currentZ = existingNode?.coordinate.z ?? 0;

            updateNode(change.id, {
              coordinate: toGraphCoordinate(change.position.x, change.position.y, currentZ),
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
    [onNodesChange, project.nodes, updateNode, selectNode, removeNode]
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

  // Handle new edge connection (supports cross-Z edges via ghost nodes)
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (
        connection.source !== null &&
        connection.target !== null &&
        connection.source !== connection.target
      ) {
        // Verify both nodes exist in project (handles ghost nodes from adjacent Z layers)
        const sourceExists = project.nodes.some((n) => n.id === connection.source);
        const targetExists = project.nodes.some((n) => n.id === connection.target);

        if (sourceExists && targetExists) {
          const edge = createEdge(connection.source, connection.target);
          addEdgeToStore(edge);
        }
      }
    },
    [addEdgeToStore, project.nodes]
  );

  // Handle node click for edge creation mode
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!isEdgeCreationMode) {
        // Normal mode: just select the node
        selectNode(node.id);
        return;
      }

      // Edge creation mode
      const nodeId = node.id;

      // Verify node exists in project (handles ghost nodes)
      const nodeExists = project.nodes.some((n) => n.id === nodeId);
      if (!nodeExists) return;

      if (sourceNodeId === null) {
        // First click: set source node
        setSourceNode(nodeId);
        selectNode(nodeId);
      } else if (sourceNodeId !== nodeId) {
        // Second click on different node: create edge
        const edge = createEdge(sourceNodeId, nodeId);
        addEdgeToStore(edge);
        clearSourceNode();
        selectNode(nodeId);
      }
      // If clicking the same node as source, do nothing
    },
    [
      isEdgeCreationMode,
      sourceNodeId,
      project.nodes,
      selectNode,
      setSourceNode,
      clearSourceNode,
      addEdgeToStore,
    ]
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

      // In 2d-projection mode, new nodes get z=0
      // In 2d-slice mode, new nodes get the current Z-slice value
      const newZ = viewMode === "2d-projection" ? 0 : currentZSlice;
      const coordinate = toGraphCoordinate(flowPosition.x, flowPosition.y, newZ);

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
    [project.nodes, viewMode, currentZSlice, addNode, selectNode, screenToFlowPosition]
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
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      onDoubleClick={handlePaneDoubleClick}
      zoomOnDoubleClick={false}
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
