/**
 * Working Plane Grid Component
 *
 * Renders a semi-transparent grid plane in 3D space for editing reference.
 * - Supports XY, XZ, YZ planes
 * - Shows grid lines for coordinate reference
 * - Clickable for node placement
 */

"use client";

import type { WorkingPlane } from "@/stores/uiStore";
import { Grid } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { memo, useMemo } from "react";
import * as THREE from "three";

interface WorkingPlaneGridProps {
  plane: WorkingPlane;
  offset: number;
  size?: number;
  visible?: boolean;
  onClick?: (point: THREE.Vector3) => void;
}

function WorkingPlaneGridComponent({
  plane,
  offset,
  size = 10,
  visible = true,
  onClick,
}: WorkingPlaneGridProps): React.ReactNode {
  // Calculate position and rotation based on plane type
  // Coordinate mapping: Graph X -> Three X, Graph Y -> Three Z, Graph Z -> Three Y
  const { position, rotation } = useMemo(() => {
    switch (plane) {
      case "XY":
        // XY plane at fixed Z (Graph) = fixed Y (Three)
        return {
          position: new THREE.Vector3(0, offset, 0),
          rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
        };
      case "XZ":
        // XZ plane at fixed Y (Graph) = fixed Z (Three)
        return {
          position: new THREE.Vector3(0, 0, offset),
          rotation: new THREE.Euler(0, 0, 0),
        };
      case "YZ":
        // YZ plane at fixed X
        return {
          position: new THREE.Vector3(offset, 0, 0),
          rotation: new THREE.Euler(0, 0, Math.PI / 2),
        };
    }
  }, [plane, offset]);

  // Create invisible mesh for click detection
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (onClick) {
      event.stopPropagation();
      onClick(event.point);
    }
  };

  if (!visible) return null;

  return (
    <group position={position} rotation={rotation}>
      {/* Grid visualization */}
      <Grid
        args={[size, size]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#3b82f6"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />

      {/* Clickable plane mesh (invisible but interactive) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} onPointerDown={handlePointerDown}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial transparent opacity={0.05} color="#3b82f6" side={THREE.DoubleSide} />
      </mesh>

      {/* Plane border indicator */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(size, size)]} />
        <lineBasicMaterial color="#3b82f6" linewidth={2} />
      </lineSegments>
    </group>
  );
}

export const WorkingPlaneGrid = memo(WorkingPlaneGridComponent);
