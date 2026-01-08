/**
 * Edge Creation Toolbar
 *
 * Provides controls for edge creation mode:
 * - Toggle button to enter/exit edge creation mode
 * - Status display showing selected source node
 * - Useful for creating cross-Z edges by sequential node selection
 */

"use client";

import { useEdgeCreationStore } from "@/stores/edgeCreationStore";

export function EdgeCreationToolbar(): React.ReactNode {
  const isEdgeCreationMode = useEdgeCreationStore((state) => state.isEdgeCreationMode);
  const sourceNodeId = useEdgeCreationStore((state) => state.sourceNodeId);
  const enterEdgeCreationMode = useEdgeCreationStore((state) => state.enterEdgeCreationMode);
  const exitEdgeCreationMode = useEdgeCreationStore((state) => state.exitEdgeCreationMode);

  const handleToggle = () => {
    if (isEdgeCreationMode) {
      exitEdgeCreationMode();
    } else {
      enterEdgeCreationMode();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          isEdgeCreationMode
            ? "bg-purple-500 text-white hover:bg-purple-600"
            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
        }`}
      >
        {isEdgeCreationMode ? "Exit Edge Mode" : "Create Edge"}
      </button>

      {isEdgeCreationMode && (
        <span className="text-sm text-purple-600">
          {sourceNodeId !== null ? (
            <>
              From: <span className="font-medium">{sourceNodeId}</span> → Select target...
            </>
          ) : (
            "Select source node..."
          )}
        </span>
      )}
    </div>
  );
}
