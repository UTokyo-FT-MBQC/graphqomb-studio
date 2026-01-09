/**
 * useWorkingPlane Hook
 *
 * Provides utilities for working plane raycasting and coordinate conversion.
 * Used for 3D editing to convert mouse clicks to graph coordinates.
 */

"use client";

import type { WorkingPlane } from "@/stores/uiStore";
import { useCallback, useMemo } from "react";
import * as THREE from "three";

// Coordinate system mapping:
// Graph X -> Three.js X
// Graph Y -> Three.js Z
// Graph Z -> Three.js Y

interface WorkingPlaneUtils {
  /**
   * Get the intersection point on the working plane from a mouse event.
   * Returns null if no intersection.
   */
  getIntersection: (event: { point: THREE.Vector3 }) => THREE.Vector3 | null;

  /**
   * Convert Three.js coordinates to graph coordinates.
   */
  threeToGraph: (point: THREE.Vector3) => { x: number; y: number; z: number };

  /**
   * Convert graph coordinates to Three.js coordinates.
   */
  graphToThree: (coord: { x: number; y: number; z: number }) => THREE.Vector3;

  /**
   * Get the plane normal in Three.js space.
   */
  planeNormal: THREE.Vector3;

  /**
   * Get the Three.js Plane object for raycasting.
   */
  threePlane: THREE.Plane;
}

export function useWorkingPlane(plane: WorkingPlane, offset: number): WorkingPlaneUtils {
  // Calculate plane normal and position in Three.js space
  const { planeNormal, threePlane } = useMemo(() => {
    let normal: THREE.Vector3;
    let planeConstant: number;

    switch (plane) {
      case "XY":
        // XY plane: Z fixed in graph space = Y fixed in Three.js
        // Normal points in Three.js Y direction
        normal = new THREE.Vector3(0, 1, 0);
        planeConstant = -offset; // Plane at y = offset
        break;
      case "XZ":
        // XZ plane: Y fixed in graph space = Z fixed in Three.js
        // Normal points in Three.js Z direction
        normal = new THREE.Vector3(0, 0, 1);
        planeConstant = -offset; // Plane at z = offset
        break;
      case "YZ":
        // YZ plane: X fixed in graph space = X fixed in Three.js
        // Normal points in Three.js X direction
        normal = new THREE.Vector3(1, 0, 0);
        planeConstant = -offset; // Plane at x = offset
        break;
    }

    return {
      planeNormal: normal,
      threePlane: new THREE.Plane(normal, planeConstant),
    };
  }, [plane, offset]);

  // Convert Three.js coordinates to graph coordinates
  const threeToGraph = useCallback((point: THREE.Vector3): { x: number; y: number; z: number } => {
    // Three.js X -> Graph X
    // Three.js Z -> Graph Y
    // Three.js Y -> Graph Z
    return {
      x: Math.round(point.x * 100) / 100,
      y: Math.round(point.z * 100) / 100,
      z: Math.round(point.y * 100) / 100,
    };
  }, []);

  // Convert graph coordinates to Three.js coordinates
  const graphToThree = useCallback((coord: { x: number; y: number; z: number }): THREE.Vector3 => {
    // Graph X -> Three.js X
    // Graph Y -> Three.js Z
    // Graph Z -> Three.js Y
    return new THREE.Vector3(coord.x, coord.z, coord.y);
  }, []);

  // Get intersection point from pointer event
  const getIntersection = useCallback(
    (event: { point: THREE.Vector3 }): THREE.Vector3 | null => {
      // The event.point already contains the intersection point
      // We just need to snap it to the working plane if needed
      const point = event.point.clone();

      // Snap to grid (integer coordinates)
      switch (plane) {
        case "XY":
          point.x = Math.round(point.x);
          point.z = Math.round(point.z);
          point.y = offset;
          break;
        case "XZ":
          point.x = Math.round(point.x);
          point.y = Math.round(point.y);
          point.z = offset;
          break;
        case "YZ":
          point.z = Math.round(point.z);
          point.y = Math.round(point.y);
          point.x = offset;
          break;
      }

      return point;
    },
    [plane, offset]
  );

  return {
    getIntersection,
    threeToGraph,
    graphToThree,
    planeNormal,
    threePlane,
  };
}
