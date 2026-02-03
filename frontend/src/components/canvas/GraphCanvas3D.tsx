/**
 * Graph Canvas 3D Component
 *
 * 3D isometric view using React Three Fiber.
 * - Sphere meshes for nodes (role-based colors)
 * - Line segments for edges
 * - OrbitControls for camera manipulation
 * - Z-axis pointing up
 * - 3D editing mode with working plane
 */

"use client";

import { FlowOverlay3D } from "@/components/canvas/FlowOverlay3D";
import { WorkingPlaneGrid } from "@/components/canvas/WorkingPlaneGrid";
import { useFTQCVisualization } from "@/hooks/useFTQCVisualization";
import { useWorkingPlane } from "@/hooks/useWorkingPlane";
import type { FTQCHighlight } from "@/lib/ftqcColors";
import { useEdgeCreationStore } from "@/stores/edgeCreationStore";
import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUIStore } from "@/stores/uiStore";
import type { GraphEdge, GraphNode, IntermediateNode, NodeRole } from "@/types";
import { createEdge } from "@/types";
import { Line, OrbitControls, Text } from "@react-three/drei";
import { Canvas, type ThreeElements, type ThreeEvent } from "@react-three/fiber";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// Extend JSX.IntrinsicElements for React Three Fiber
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      group: ThreeElements["group"];
      mesh: ThreeElements["mesh"];
      sphereGeometry: ThreeElements["sphereGeometry"];
      meshStandardMaterial: ThreeElements["meshStandardMaterial"];
      ambientLight: ThreeElements["ambientLight"];
      directionalLight: ThreeElements["directionalLight"];
      gridHelper: ThreeElements["gridHelper"];
      axesHelper: ThreeElements["axesHelper"];
    }
  }
}

// Role-based colors matching 2D view
const ROLE_COLORS: Record<NodeRole, string> = {
  input: "#22c55e", // green-500
  output: "#3b82f6", // blue-500
  intermediate: "#6b7280", // gray-500
};

const SELECTED_EMISSIVE = "#ffffff";

// Get 3D position from graph node (graph Z -> Three.js Y for upward axis)
function getPosition(node: GraphNode): [number, number, number] {
  const { x, y, z } = node.coordinate;
  // Map: graph X -> Three X, graph Y -> Three Z, graph Z -> Three Y (up)
  return [x, z, y];
}

interface Node3DProps {
  node: GraphNode;
  isSelected: boolean;
  isSourceNode: boolean;
  isEdgeCreationMode: boolean;
  isDragging: boolean;
  ftqcHighlight: FTQCHighlight | undefined;
  onClick: () => void;
  onDragStart: ((nodeId: string, event: ThreeEvent<PointerEvent>) => void) | undefined;
}

function Node3DComponent({
  node,
  isSelected,
  isSourceNode,
  isEdgeCreationMode,
  isDragging,
  ftqcHighlight,
  onClick,
  onDragStart,
}: Node3DProps): React.ReactNode {
  const position = useMemo(() => getPosition(node), [node]);
  const color = ROLE_COLORS[node.role];

  // Node label visibility
  const showNodeLabels = useUIStore((s) => s.showNodeLabels);

  // Determine emissive effect based on state priority (lowest to highest):
  // 1. FTQC group highlight (lowest priority)
  // 2. Selected node
  // 3. Edge source node
  // 4. Dragging (highest priority)
  let emissiveColor: string | undefined;
  let emissiveIntensity = 0;

  if (ftqcHighlight !== undefined) {
    emissiveColor = ftqcHighlight.colorHex;
    emissiveIntensity = 0.4;
  }
  if (isSelected) {
    emissiveColor = SELECTED_EMISSIVE;
    emissiveIntensity = 0.3;
  }
  if (isSourceNode) {
    emissiveColor = "#a855f7";
    emissiveIntensity = 0.5;
  }
  if (isDragging) {
    emissiveColor = "#f97316"; // orange for dragging
    emissiveIntensity = 0.5;
  }

  // Handle pointer down for drag initiation
  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (onDragStart) {
        event.stopPropagation();
        onDragStart(node.id, event);
      }
    },
    [node.id, onDragStart]
  );

  return (
    <group position={position}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Three.js mesh elements don't support keyboard events */}
      <mesh onClick={onClick} onPointerDown={handlePointerDown}>
        <sphereGeometry args={[isDragging ? 0.18 : isEdgeCreationMode ? 0.18 : 0.15, 32, 32]} />
        <meshStandardMaterial
          color={color}
          {...(emissiveColor !== undefined ? { emissive: emissiveColor, emissiveIntensity } : {})}
        />
      </mesh>
      {/* Node label */}
      {showNodeLabels && (
        <Text
          position={[0, 0.25, 0]}
          fontSize={0.12}
          color="#374151"
          anchorX="center"
          anchorY="bottom"
        >
          {node.id}
        </Text>
      )}
    </group>
  );
}

const Node3D = memo(Node3DComponent);

interface Edge3DProps {
  edge: GraphEdge;
  nodes: readonly GraphNode[];
  isSelected: boolean;
  onClick: () => void;
}

function Edge3DComponent({ edge, nodes, isSelected, onClick }: Edge3DProps): React.ReactNode {
  const points = useMemo(() => {
    const source = nodes.find((n) => n.id === edge.source);
    const target = nodes.find((n) => n.id === edge.target);
    if (source === undefined || target === undefined) return null;

    return [new THREE.Vector3(...getPosition(source)), new THREE.Vector3(...getPosition(target))];
  }, [edge, nodes]);

  if (points === null) return null;

  return (
    <Line
      points={points}
      color={isSelected ? "#3b82f6" : "#6b7280"}
      lineWidth={isSelected ? 3 : 2}
      onClick={onClick}
    />
  );
}

const Edge3D = memo(Edge3DComponent);

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

function Scene(): React.ReactNode {
  const project = useProjectStore((state) => state.project);
  const addNode = useProjectStore((state) => state.addNode);
  const updateNode = useProjectStore((state) => state.updateNode);
  const addEdgeToStore = useProjectStore((state) => state.addEdge);
  const selectedNodeId = useSelectionStore((state) => state.selectedNodeId);
  const selectedEdgeId = useSelectionStore((state) => state.selectedEdgeId);
  const selectNode = useSelectionStore((state) => state.selectNode);
  const selectEdge = useSelectionStore((state) => state.selectEdge);

  // UI state for 3D editing
  const is3DEditMode = useUIStore((state) => state.is3DEditMode);
  const workingPlane = useUIStore((state) => state.workingPlane);
  const workingPlaneOffset = useUIStore((state) => state.workingPlaneOffset);
  const showWorkingPlaneGrid = useUIStore((state) => state.showWorkingPlaneGrid);

  // Edge creation state
  const isEdgeCreationMode = useEdgeCreationStore((state) => state.isEdgeCreationMode);
  const sourceNodeId = useEdgeCreationStore((state) => state.sourceNodeId);
  const setSourceNode = useEdgeCreationStore((state) => state.setSourceNode);
  const clearSourceNode = useEdgeCreationStore((state) => state.clearSourceNode);

  // FTQC visualization state
  const { highlights: ftqcHighlights } = useFTQCVisualization();

  // Working plane utilities
  const { threeToGraph, threePlane } = useWorkingPlane(workingPlane, workingPlaneOffset);

  // OrbitControls ref for drag control
  // biome-ignore lint/suspicious/noExplicitAny: OrbitControls type from three-stdlib is not available
  const controlsRef = useRef<any>(null);

  // Drag state
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedNodeId: string | null;
  }>({
    isDragging: false,
    draggedNodeId: null,
  });

  // Handle drag start
  const handleDragStart = useCallback(
    (nodeId: string, event: ThreeEvent<PointerEvent>) => {
      if (!is3DEditMode) return;

      event.stopPropagation();

      // Disable OrbitControls during drag
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }

      setDragState({
        isDragging: true,
        draggedNodeId: nodeId,
      });
      selectNode(nodeId);
    },
    [is3DEditMode, selectNode]
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!dragState.isDragging || dragState.draggedNodeId === null) return;

      // Raycast to working plane
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(event.pointer, event.camera);

      const intersectPoint = new THREE.Vector3();
      const result = raycaster.ray.intersectPlane(threePlane, intersectPoint);

      if (result) {
        // Snap to grid (integer coordinates)
        intersectPoint.x = Math.round(intersectPoint.x);
        intersectPoint.y = Math.round(intersectPoint.y);
        intersectPoint.z = Math.round(intersectPoint.z);

        const newCoord = threeToGraph(intersectPoint);
        updateNode(dragState.draggedNodeId, { coordinate: newCoord });
      }
    },
    [dragState, threePlane, threeToGraph, updateNode]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    // Re-enable OrbitControls
    if (controlsRef.current) {
      controlsRef.current.enabled = true;
    }

    setDragState({
      isDragging: false,
      draggedNodeId: null,
    });
  }, []);

  // Handle node click for edge creation mode
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (!isEdgeCreationMode) {
        selectNode(nodeId);
        return;
      }

      if (sourceNodeId === null) {
        setSourceNode(nodeId);
        selectNode(nodeId);
      } else if (sourceNodeId !== nodeId) {
        const edge = createEdge(sourceNodeId, nodeId);
        addEdgeToStore(edge);
        clearSourceNode();
        selectNode(nodeId);
      }
    },
    [isEdgeCreationMode, sourceNodeId, selectNode, setSourceNode, clearSourceNode, addEdgeToStore]
  );

  // Handle working plane click for node creation
  const handlePlaneClick = useCallback(
    (point: THREE.Vector3) => {
      if (!is3DEditMode) return;

      const graphCoord = threeToGraph(point);
      const existingIds = project.nodes.map((n) => n.id);
      const newId = generateNodeId(existingIds);

      const newNode: IntermediateNode = {
        id: newId,
        coordinate: graphCoord,
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
    [is3DEditMode, threeToGraph, project.nodes, addNode, selectNode]
  );

  // Calculate bounding box center for camera focus
  const center = useMemo(() => {
    if (project.nodes.length === 0) return [0, 0, 0] as [number, number, number];

    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    for (const node of project.nodes) {
      const pos = getPosition(node);
      sumX += pos[0];
      sumY += pos[1];
      sumZ += pos[2];
    }

    const count = project.nodes.length;
    return [sumX / count, sumY / count, sumZ / count] as [number, number, number];
  }, [project.nodes]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />

      {/* Grid helper */}
      <gridHelper args={[10, 10, "#d1d5db", "#e5e7eb"]} />

      {/* Axes helper */}
      <axesHelper args={[2]} />

      {/* Working plane grid (only in edit mode) */}
      {is3DEditMode && (
        <WorkingPlaneGrid
          plane={workingPlane}
          offset={workingPlaneOffset}
          visible={showWorkingPlaneGrid}
          onClick={handlePlaneClick}
        />
      )}

      {/* Nodes */}
      {project.nodes.map((node) => (
        <Node3D
          key={node.id}
          node={node}
          isSelected={node.id === selectedNodeId}
          isSourceNode={node.id === sourceNodeId}
          isEdgeCreationMode={isEdgeCreationMode}
          isDragging={dragState.draggedNodeId === node.id}
          ftqcHighlight={ftqcHighlights.get(node.id)}
          onClick={() => handleNodeClick(node.id)}
          onDragStart={is3DEditMode ? handleDragStart : undefined}
        />
      ))}

      {/* Edges */}
      {project.edges.map((edge) => (
        <Edge3D
          key={edge.id}
          edge={edge}
          nodes={project.nodes}
          isSelected={edge.id === selectedEdgeId}
          onClick={() => selectEdge(edge.id)}
        />
      ))}

      {/* Flow arrows overlay */}
      <FlowOverlay3D />

      {/* Invisible plane for drag detection */}
      {dragState.isDragging && (
        <mesh visible={false} onPointerMove={handleDragMove} onPointerUp={handleDragEnd}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}

      {/* Camera Controls */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={center}
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={50}
      />
    </>
  );
}

export function GraphCanvas3D(): React.ReactNode {
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const selectedNodeId = useSelectionStore((state) => state.selectedNodeId);
  const selectedEdgeId = useSelectionStore((state) => state.selectedEdgeId);
  const removeNode = useProjectStore((state) => state.removeNode);
  const removeEdge = useProjectStore((state) => state.removeEdge);

  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard handler for deletion
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Ignore if target is input element
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();

        if (selectedNodeId !== null) {
          removeNode(selectedNodeId);
          clearSelection();
        } else if (selectedEdgeId !== null) {
          removeEdge(selectedEdgeId);
          clearSelection();
        }
      }
    },
    [selectedNodeId, selectedEdgeId, removeNode, removeEdge, clearSelection]
  );

  // Focus container on click for keyboard events
  const handleContainerClick = useCallback(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-gray-50 focus:outline-none"
      role="application"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={handleContainerClick}
    >
      <Canvas
        camera={{
          position: [5, 5, 5],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        onPointerMissed={clearSelection}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
