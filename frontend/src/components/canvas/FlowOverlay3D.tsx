/**
 * Flow Overlay 3D
 *
 * Renders flow arrows (X-Flow and Z-Flow) as 3D elements in Three.js.
 * - X-Flow: Red dashed arrows
 * - Z-Flow: Blue dashed arrows
 *
 * Uses drei's Line component for dashed lines and coneGeometry for arrowheads.
 */

"use client";

import { useResolvedFlow } from "@/hooks/useResolvedFlow";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import type { GraphNode } from "@/types";
import { Line } from "@react-three/drei";
import { memo, useMemo } from "react";
import * as THREE from "three";

// Arrow configuration
const ARROW_OFFSET = 0.2; // Offset from node center (node radius is 0.15)
const ARROW_HEAD_LENGTH = 0.1;
const ARROW_HEAD_RADIUS = 0.04;

// Self-loop configuration
const SELF_LOOP_RADIUS = 0.3;
const SELF_LOOP_HEIGHT = 0.25;

// Dashed line configuration
const DASH_SIZE = 0.1;
const GAP_SIZE = 0.05;

// Flow colors
const X_FLOW_COLOR = "#ef4444"; // red-500
const Z_FLOW_COLOR = "#3b82f6"; // blue-500

// Get 3D position from graph node (graph Z -> Three.js Y for upward axis)
function getPosition(node: GraphNode): THREE.Vector3 {
  const { x, y, z } = node.coordinate;
  // Map: graph X -> Three X, graph Y -> Three Z, graph Z -> Three Y (up)
  return new THREE.Vector3(x, z, y);
}

interface FlowArrow3DProps {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
}

/**
 * 3D arrow between two points with dashed line and cone arrowhead
 */
const FlowArrow3D = memo(function FlowArrow3D({
  from,
  to,
  color,
}: FlowArrow3DProps): React.ReactNode {
  const { points, headPosition, headRotation } = useMemo(() => {
    const direction = to.clone().sub(from);
    const length = direction.length();

    // Handle zero-length case (different nodes at same position)
    if (length === 0) {
      const defaultDir = new THREE.Vector3(1, 0, 0);
      return {
        points: [
          from.clone().add(defaultDir.clone().multiplyScalar(ARROW_OFFSET)),
          from.clone().add(defaultDir.clone().multiplyScalar(ARROW_OFFSET + 0.01)),
        ],
        headPosition: from.clone().add(defaultDir.clone().multiplyScalar(ARROW_OFFSET + 0.01)),
        headRotation: new THREE.Euler(0, 0, -Math.PI / 2),
      };
    }

    const normalizedDir = direction.clone().normalize();

    // Calculate start and end with offset
    const start = from.clone().add(normalizedDir.clone().multiplyScalar(ARROW_OFFSET));
    const end = to.clone().sub(normalizedDir.clone().multiplyScalar(ARROW_OFFSET));

    // Position arrowhead at the end
    const headPos = end.clone();

    // Calculate rotation for arrowhead (default cone points up in +Y)
    // We need to rotate it to point in the direction of the arrow
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normalizedDir);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      points: [start, end],
      headPosition: headPos,
      headRotation: euler,
    };
  }, [from, to]);

  return (
    <group>
      {/* Dashed line */}
      <Line
        points={points}
        color={color}
        lineWidth={2}
        dashed
        dashSize={DASH_SIZE}
        gapSize={GAP_SIZE}
      />
      {/* Arrowhead cone */}
      <mesh position={headPosition} rotation={headRotation}>
        <coneGeometry args={[ARROW_HEAD_RADIUS, ARROW_HEAD_LENGTH, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
});

interface FlowSelfLoop3DProps {
  position: THREE.Vector3;
  color: string;
}

/**
 * Self-loop arrow for nodes that flow to themselves
 * Draws an elliptical loop above the node
 */
const FlowSelfLoop3D = memo(function FlowSelfLoop3D({
  position,
  color,
}: FlowSelfLoop3DProps): React.ReactNode {
  const { curvePoints, headPosition, headRotation } = useMemo(() => {
    // Generate points for the loop curve above the node
    // Loop goes: right -> up-right -> top -> up-left -> left
    const points: THREE.Vector3[] = [];
    const segments = 24;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      // Parametric curve for an elliptical loop above the node
      // Starting from right side, going counter-clockwise
      const angle = Math.PI * t; // 0 to PI (half circle, top-side)
      const x = position.x + Math.cos(angle) * SELF_LOOP_RADIUS * 0.8;
      const y = position.y + SELF_LOOP_HEIGHT + Math.sin(angle) * SELF_LOOP_RADIUS;
      const z = position.z;

      points.push(new THREE.Vector3(x, y, z));
    }

    // Calculate arrowhead position and direction
    // We always generate segments+1 points (25), so these are guaranteed to exist
    const lastPoint = points.at(-1);
    const secondLastPoint = points.at(-2);

    // Safety check (should never happen due to loop above)
    if (lastPoint === undefined || secondLastPoint === undefined) {
      return {
        curvePoints: points,
        headPosition: position.clone(),
        headRotation: new THREE.Euler(),
      };
    }

    const headPos = lastPoint.clone();

    // Direction for arrowhead (tangent at the end of curve, pointing toward the end)
    const tangent = lastPoint.clone().sub(secondLastPoint).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, tangent);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      curvePoints: points,
      headPosition: headPos,
      headRotation: euler,
    };
  }, [position]);

  return (
    <group>
      {/* Curved dashed line */}
      <Line
        points={curvePoints}
        color={color}
        lineWidth={2}
        dashed
        dashSize={DASH_SIZE}
        gapSize={GAP_SIZE}
      />
      {/* Arrowhead cone */}
      <mesh position={headPosition} rotation={headRotation}>
        <coneGeometry args={[ARROW_HEAD_RADIUS, ARROW_HEAD_LENGTH, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
});

interface ArrowData {
  id: string;
  from: THREE.Vector3;
  to: THREE.Vector3;
}

interface SelfLoopData {
  id: string;
  position: THREE.Vector3;
}

/**
 * Flow Overlay 3D Component
 *
 * Renders X-Flow and Z-Flow arrows in 3D space
 */
export function FlowOverlay3D(): React.ReactNode {
  const project = useProjectStore((state) => state.project);
  const showXFlow = useUIStore((state) => state.showXFlow);
  const showZFlow = useUIStore((state) => state.showZFlow);
  const { resolvedFlow } = useResolvedFlow();

  // Build node position map
  const nodePositions = useMemo(() => {
    const positions = new Map<string, THREE.Vector3>();
    for (const node of project.nodes) {
      positions.set(node.id, getPosition(node));
    }
    return positions;
  }, [project.nodes]);

  // Generate X-Flow arrows and self-loops
  const { xflowArrows, xflowSelfLoops } = useMemo<{
    xflowArrows: ArrowData[];
    xflowSelfLoops: SelfLoopData[];
  }>(() => {
    if (!showXFlow) return { xflowArrows: [], xflowSelfLoops: [] };

    const arrows: ArrowData[] = [];
    const selfLoops: SelfLoopData[] = [];

    for (const [sourceId, targets] of Object.entries(project.flow.xflow)) {
      const sourcePos = nodePositions.get(sourceId);
      if (sourcePos === undefined) continue;

      for (const targetId of targets) {
        const targetPos = nodePositions.get(targetId);
        if (targetPos === undefined) continue;

        // Detect self-loop by node ID
        if (sourceId === targetId) {
          selfLoops.push({
            id: `xflow-${sourceId}-${targetId}`,
            position: sourcePos,
          });
        } else {
          arrows.push({
            id: `xflow-${sourceId}-${targetId}`,
            from: sourcePos,
            to: targetPos,
          });
        }
      }
    }
    return { xflowArrows: arrows, xflowSelfLoops: selfLoops };
  }, [showXFlow, project.flow.xflow, nodePositions]);

  // Generate Z-Flow arrows and self-loops
  const { zflowArrows, zflowSelfLoops } = useMemo<{
    zflowArrows: ArrowData[];
    zflowSelfLoops: SelfLoopData[];
  }>(() => {
    if (!showZFlow) return { zflowArrows: [], zflowSelfLoops: [] };

    // Use resolved flow if available, otherwise use manual zflow
    const zflowData =
      project.flow.zflow === "auto"
        ? (resolvedFlow?.zflow ?? {}) // Use resolved if available
        : project.flow.zflow;

    const arrows: ArrowData[] = [];
    const selfLoops: SelfLoopData[] = [];

    for (const [sourceId, targets] of Object.entries(zflowData)) {
      const sourcePos = nodePositions.get(sourceId);
      if (sourcePos === undefined) continue;

      for (const targetId of targets) {
        const targetPos = nodePositions.get(targetId);
        if (targetPos === undefined) continue;

        // Detect self-loop by node ID
        if (sourceId === targetId) {
          selfLoops.push({
            id: `zflow-${sourceId}-${targetId}`,
            position: sourcePos,
          });
        } else {
          arrows.push({
            id: `zflow-${sourceId}-${targetId}`,
            from: sourcePos,
            to: targetPos,
          });
        }
      }
    }
    return { zflowArrows: arrows, zflowSelfLoops: selfLoops };
  }, [showZFlow, project.flow.zflow, resolvedFlow, nodePositions]);

  // Don't render if nothing to show
  if (!showXFlow && !showZFlow) {
    return null;
  }

  const hasXFlow = xflowArrows.length > 0 || xflowSelfLoops.length > 0;
  const hasZFlow = zflowArrows.length > 0 || zflowSelfLoops.length > 0;

  if (!hasXFlow && !hasZFlow) {
    return null;
  }

  return (
    <group>
      {/* X-Flow arrows (red) */}
      {xflowArrows.map((arrow) => (
        <FlowArrow3D key={arrow.id} from={arrow.from} to={arrow.to} color={X_FLOW_COLOR} />
      ))}

      {/* X-Flow self-loops (red) */}
      {xflowSelfLoops.map((loop) => (
        <FlowSelfLoop3D key={loop.id} position={loop.position} color={X_FLOW_COLOR} />
      ))}

      {/* Z-Flow arrows (blue) */}
      {zflowArrows.map((arrow) => (
        <FlowArrow3D key={arrow.id} from={arrow.from} to={arrow.to} color={Z_FLOW_COLOR} />
      ))}

      {/* Z-Flow self-loops (blue) */}
      {zflowSelfLoops.map((loop) => (
        <FlowSelfLoop3D key={loop.id} position={loop.position} color={Z_FLOW_COLOR} />
      ))}
    </group>
  );
}
