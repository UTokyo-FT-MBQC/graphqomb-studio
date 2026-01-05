/**
 * Graph Canvas 3D Component
 *
 * 3D isometric view using React Three Fiber.
 * - Sphere meshes for nodes (role-based colors)
 * - Line segments for edges
 * - OrbitControls for camera manipulation
 * - Z-axis pointing up
 */

"use client";

import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import type { GraphEdge, GraphNode, NodeRole } from "@/types";
import { is3D } from "@/types";
import { Line, OrbitControls, Text } from "@react-three/drei";
import { Canvas, type ThreeElements } from "@react-three/fiber";
import { memo, useMemo } from "react";
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
  const { x, y } = node.coordinate;
  const z = is3D(node.coordinate) ? node.coordinate.z : 0;
  // Map: graph X -> Three X, graph Y -> Three Z, graph Z -> Three Y (up)
  return [x, z, y];
}

interface Node3DProps {
  node: GraphNode;
  isSelected: boolean;
  onClick: () => void;
}

function Node3DComponent({ node, isSelected, onClick }: Node3DProps): React.ReactNode {
  const position = useMemo(() => getPosition(node), [node]);
  const color = ROLE_COLORS[node.role];

  return (
    <group position={position}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Three.js mesh elements don't support keyboard events */}
      <mesh onClick={onClick}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial
          color={color}
          {...(isSelected ? { emissive: SELECTED_EMISSIVE, emissiveIntensity: 0.3 } : {})}
        />
      </mesh>
      {/* Node label */}
      <Text
        position={[0, 0.25, 0]}
        fontSize={0.12}
        color="#374151"
        anchorX="center"
        anchorY="bottom"
      >
        {node.id}
      </Text>
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

function Scene(): React.ReactNode {
  const project = useProjectStore((state) => state.project);
  const selectedNodeId = useSelectionStore((state) => state.selectedNodeId);
  const selectedEdgeId = useSelectionStore((state) => state.selectedEdgeId);
  const selectNode = useSelectionStore((state) => state.selectNode);
  const selectEdge = useSelectionStore((state) => state.selectEdge);

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

      {/* Nodes */}
      {project.nodes.map((node) => (
        <Node3D
          key={node.id}
          node={node}
          isSelected={node.id === selectedNodeId}
          onClick={() => selectNode(node.id)}
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

      {/* Camera Controls */}
      <OrbitControls
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

  return (
    <div className="w-full h-full bg-gray-50">
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
