/**
 * View Controls
 *
 * Provides toggle controls for:
 * - View mode (2D Slice / 3D View) when dimension === 3
 * - Flow visualization (X-Flow, Z-Flow)
 */

"use client";

import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";

export function ViewControls(): React.ReactNode {
  const dimension = useProjectStore((state) => state.project.dimension);

  const viewMode = useUIStore((state) => state.viewMode);
  const setViewMode = useUIStore((state) => state.setViewMode);
  const showXFlow = useUIStore((state) => state.showXFlow);
  const showZFlow = useUIStore((state) => state.showZFlow);
  const toggleXFlow = useUIStore((state) => state.toggleXFlow);
  const toggleZFlow = useUIStore((state) => state.toggleZFlow);

  return (
    <div className="flex items-center gap-3">
      {/* View Mode Toggle - only in 3D mode */}
      {dimension === 3 && (
        <>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode("2d-slice")}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === "2d-slice"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              2D Slice
            </button>
            <button
              type="button"
              onClick={() => setViewMode("3d-isometric")}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === "3d-isometric"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              3D View
            </button>
          </div>
          <div className="h-4 w-px bg-gray-300" />
        </>
      )}

      {/* Flow Toggles */}
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={showXFlow}
          onChange={toggleXFlow}
          className="w-4 h-4 accent-red-500"
        />
        <span className="text-sm text-red-600">X-Flow</span>
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={showZFlow}
          onChange={toggleZFlow}
          className="w-4 h-4 accent-blue-500"
        />
        <span className="text-sm text-blue-600">Z-Flow</span>
      </label>
    </div>
  );
}
