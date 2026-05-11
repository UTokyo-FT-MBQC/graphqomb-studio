/**
 * Property Panel
 *
 * Container component that displays:
 * - Node properties when a node is selected
 * - Edge properties when an edge is selected
 * - Empty state when nothing is selected
 */

"use client";

import { EdgeProperties } from "@/components/panels/EdgeProperties";
import { NodeEdgeList } from "@/components/panels/NodeEdgeList";
import { NodeProperties } from "@/components/panels/NodeProperties";
import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useCallback, useMemo, useRef, useState } from "react";

const MIN_ELEMENTS_HEIGHT = 180;
const MIN_DETAILS_HEIGHT = 180;
const DEFAULT_ELEMENTS_HEIGHT = 300;
const ELEMENTS_KEYBOARD_STEP = 24;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function PropertyPanel(): React.ReactNode {
  const project = useProjectStore((state) => state.project);
  const selectedNodeId = useSelectionStore((state) => state.selectedNodeId);
  const selectedEdgeId = useSelectionStore((state) => state.selectedEdgeId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isElementsExpanded, setIsElementsExpanded] = useState(true);
  const [elementsHeight, setElementsHeight] = useState(DEFAULT_ELEMENTS_HEIGHT);

  // Find selected node/edge from project
  const selectedNode = useMemo(
    () =>
      selectedNodeId !== null ? project.nodes.find((n) => n.id === selectedNodeId) : undefined,
    [project.nodes, selectedNodeId]
  );

  const selectedEdge = useMemo(
    () =>
      selectedEdgeId !== null ? project.edges.find((e) => e.id === selectedEdgeId) : undefined,
    [project.edges, selectedEdgeId]
  );

  const getMaxElementsHeight = useCallback(() => {
    const containerHeight = containerRef.current?.clientHeight ?? DEFAULT_ELEMENTS_HEIGHT;
    return Math.max(MIN_ELEMENTS_HEIGHT, containerHeight - MIN_DETAILS_HEIGHT);
  }, []);

  const handleElementsResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const startY = event.clientY;
      const startHeight = elementsHeight;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";

      function handlePointerMove(moveEvent: PointerEvent): void {
        const nextHeight = startHeight + moveEvent.clientY - startY;
        setElementsHeight(clamp(nextHeight, MIN_ELEMENTS_HEIGHT, getMaxElementsHeight()));
      }

      function handlePointerUp(): void {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      }

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [elementsHeight, getMaxElementsHeight]
  );

  const handleElementsResizeKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setElementsHeight((height) =>
          clamp(height - ELEMENTS_KEYBOARD_STEP, MIN_ELEMENTS_HEIGHT, getMaxElementsHeight())
        );
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setElementsHeight((height) =>
          clamp(height + ELEMENTS_KEYBOARD_STEP, MIN_ELEMENTS_HEIGHT, getMaxElementsHeight())
        );
      }
    },
    [getMaxElementsHeight]
  );

  return (
    <div ref={containerRef} className="flex h-full min-h-0 flex-col">
      {/* Elements panel (always visible at top) */}
      <div
        className={isElementsExpanded ? "min-h-[140px] shrink-0 overflow-hidden" : "shrink-0"}
        style={isElementsExpanded ? { height: elementsHeight } : undefined}
      >
        <NodeEdgeList expanded={isElementsExpanded} onExpandedChange={setIsElementsExpanded} />
      </div>

      {isElementsExpanded && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize elements list"
          tabIndex={0}
          onPointerDown={handleElementsResizeStart}
          onKeyDown={handleElementsResizeKeyDown}
          className="h-1.5 shrink-0 cursor-row-resize bg-gray-100 transition-colors hover:bg-blue-200 focus:bg-blue-200 focus:outline-none"
        />
      )}

      {/* Properties Section */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {selectedNode !== undefined ? (
          <NodeProperties node={selectedNode} />
        ) : selectedEdge !== undefined ? (
          <EdgeProperties edge={selectedEdge} />
        ) : (
          <div className="text-gray-500 text-sm">
            <p className="font-medium mb-2">No selection</p>
            <ul className="space-y-1 text-xs">
              <li>• Click a node or edge to select it</li>
              <li>• Double-click the canvas to add a node</li>
              <li>• Use edge creation mode to connect nodes</li>
              <li>• Press Delete/Backspace to remove selection</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
