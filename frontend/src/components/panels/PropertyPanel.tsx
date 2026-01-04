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
import { NodeProperties } from "@/components/panels/NodeProperties";
import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useMemo } from "react";

export function PropertyPanel(): React.ReactNode {
  const project = useProjectStore((state) => state.project);
  const selectedNodeId = useSelectionStore((state) => state.selectedNodeId);
  const selectedEdgeId = useSelectionStore((state) => state.selectedEdgeId);

  // Find selected node/edge from project
  const selectedNode = useMemo(
    () => (selectedNodeId !== null ? project.nodes.find((n) => n.id === selectedNodeId) : undefined),
    [project.nodes, selectedNodeId]
  );

  const selectedEdge = useMemo(
    () => (selectedEdgeId !== null ? project.edges.find((e) => e.id === selectedEdgeId) : undefined),
    [project.edges, selectedEdgeId]
  );

  return (
    <div className="p-4">
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
            <li>• Drag from node handle to create an edge</li>
            <li>• Press Delete/Backspace to remove selection</li>
          </ul>
        </div>
      )}
    </div>
  );
}
