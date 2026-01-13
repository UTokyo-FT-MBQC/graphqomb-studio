/**
 * useTilingDrag Hook
 *
 * Handles drag operations for tiling in 2D canvas.
 * Converts screen coordinates to graph coordinates and manages tiling store state.
 */

import { toGraphCoordinate } from "@/lib/geometry";
import { useTilingStore } from "@/stores/tilingStore";
import { useUIStore } from "@/stores/uiStore";
import type { Coordinate } from "@/types";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useRef } from "react";

interface TilingDragHandlers {
  handleMouseDown: (event: React.MouseEvent) => void;
  handleMouseMove: (event: React.MouseEvent) => void;
  handleMouseUp: (event: React.MouseEvent) => void;
  handleMouseLeave: (event: React.MouseEvent) => void;
  isActive: boolean;
}

/**
 * Hook for handling tiling drag operations in 2D canvas.
 *
 * @param currentZSlice - Current Z slice for 2D-slice mode
 * @param viewMode - Current view mode
 * @returns Drag event handlers and active state
 */
export function useTilingDrag(
  currentZSlice: number,
  viewMode: "2d-projection" | "2d-slice" | "3d-isometric"
): TilingDragHandlers {
  const { screenToFlowPosition } = useReactFlow();

  const isTilingMode = useUIStore((state) => state.isTilingMode);
  const pattern = useTilingStore((state) => state.pattern);
  const startDrag = useTilingStore((state) => state.startDrag);
  const updateDrag = useTilingStore((state) => state.updateDrag);
  const endDrag = useTilingStore((state) => state.endDrag);
  const cancelDrag = useTilingStore((state) => state.cancelDrag);
  const setBaseZ = useTilingStore((state) => state.setBaseZ);

  const isActive = isTilingMode && pattern !== null;

  // Track if we're currently in a drag operation
  const isDraggingRef = useRef(false);

  /**
   * Convert screen position to graph coordinate.
   */
  const screenToGraphCoord = useCallback(
    (clientX: number, clientY: number): Coordinate => {
      const flowPosition = screenToFlowPosition({
        x: clientX,
        y: clientY,
      });

      // For 2D-slice mode, use current Z slice; for projection, use Z=0
      const z = viewMode === "2d-projection" ? 0 : currentZSlice;

      return toGraphCoordinate(flowPosition.x, flowPosition.y, z);
    },
    [screenToFlowPosition, viewMode, currentZSlice]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!isActive) return;

      // Only handle left mouse button
      if (event.button !== 0) return;

      // Convert to graph coordinates
      const coord = screenToGraphCoord(event.clientX, event.clientY);

      // Set base Z for 2D patterns (use coordinate's Z which is the current slice)
      setBaseZ(coord.z);

      // Start drag
      startDrag(coord);
      isDraggingRef.current = true;
    },
    [isActive, screenToGraphCoord, startDrag, setBaseZ]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!isActive || !isDraggingRef.current) return;

      // Convert to graph coordinates
      const coord = screenToGraphCoord(event.clientX, event.clientY);

      // Update drag position
      updateDrag(coord);
    },
    [isActive, screenToGraphCoord, updateDrag]
  );

  const handleMouseUp = useCallback(
    (event: React.MouseEvent) => {
      if (!isActive || !isDraggingRef.current) return;

      // Only handle left mouse button
      if (event.button !== 0) return;

      // End drag
      endDrag();
      isDraggingRef.current = false;
    },
    [isActive, endDrag]
  );

  const handleMouseLeave = useCallback(
    (_event: React.MouseEvent) => {
      if (!isActive || !isDraggingRef.current) return;

      // Cancel drag when mouse leaves canvas
      cancelDrag();
      isDraggingRef.current = false;
    },
    [isActive, cancelDrag]
  );

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    isActive,
  };
}
