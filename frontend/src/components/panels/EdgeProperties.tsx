/**
 * Edge Properties Panel
 *
 * Displays edge properties:
 * - Source and target nodes
 * - Delete button
 */

"use client";

import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import type { GraphEdge } from "@/types";
import { useCallback } from "react";

interface EdgePropertiesProps {
  edge: GraphEdge;
}

export function EdgeProperties({ edge }: EdgePropertiesProps): React.ReactNode {
  const removeEdge = useProjectStore((state) => state.removeEdge);
  const clearSelection = useSelectionStore((state) => state.clearSelection);

  const handleDelete = useCallback(() => {
    removeEdge(edge.id);
    clearSelection();
  }, [edge.id, removeEdge, clearSelection]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Edge</h3>
        <button
          type="button"
          onClick={handleDelete}
          className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
        >
          Delete
        </button>
      </div>

      <div className="border-t pt-4 space-y-3">
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">Connection</span>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-gray-100 rounded font-mono">{edge.source}</span>
            <span className="text-gray-400">→</span>
            <span className="px-2 py-1 bg-gray-100 rounded font-mono">{edge.target}</span>
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">Edge ID</span>
          <div className="text-sm text-gray-500 font-mono">{edge.id}</div>
        </div>
      </div>
    </div>
  );
}
