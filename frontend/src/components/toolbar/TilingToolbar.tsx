/**
 * Tiling Toolbar Component
 *
 * UI for tiling feature:
 * - Toggle tiling mode
 * - Select pattern from presets
 * - Apply/Cancel preview
 */

"use client";

import { getAvailable2DPresets, useTilingStore } from "@/stores/tilingStore";
import { useUIStore } from "@/stores/uiStore";
import { useCallback, useMemo } from "react";

export function TilingToolbar(): React.ReactNode {
  const isTilingMode = useUIStore((state) => state.isTilingMode);
  const setTilingMode = useUIStore((state) => state.setTilingMode);

  const selectedPatternId = useTilingStore((state) => state.selectedPatternId);
  const pattern = useTilingStore((state) => state.pattern);
  const previewGraph = useTilingStore((state) => state.previewGraph);
  const error = useTilingStore((state) => state.error);
  const selectPattern = useTilingStore((state) => state.selectPattern);
  const applyTiling = useTilingStore((state) => state.applyTiling);
  const clearPreview = useTilingStore((state) => state.clearPreview);
  const reset = useTilingStore((state) => state.reset);

  const presets = useMemo(() => getAvailable2DPresets(), []);

  const handleToggleTilingMode = useCallback(() => {
    if (isTilingMode) {
      // Exiting tiling mode - clear everything
      reset();
      setTilingMode(false);
    } else {
      // Entering tiling mode
      setTilingMode(true);
    }
  }, [isTilingMode, reset, setTilingMode]);

  const handlePatternChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const patternId = e.target.value;
      if (patternId !== "") {
        selectPattern(patternId);
      }
    },
    [selectPattern]
  );

  const handleApply = useCallback(() => {
    applyTiling();
  }, [applyTiling]);

  const handleCancel = useCallback(() => {
    clearPreview();
  }, [clearPreview]);

  const hasPreview = previewGraph !== null && previewGraph.nodes.length > 0;

  return (
    <div className="flex items-center gap-2">
      {/* Tiling Mode Toggle */}
      <button
        type="button"
        onClick={handleToggleTilingMode}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          isTilingMode
            ? "bg-purple-500 text-white hover:bg-purple-600"
            : "bg-purple-100 hover:bg-purple-200 text-purple-700"
        }`}
      >
        {isTilingMode ? "Exit Tiling" : "Tiling"}
      </button>

      {/* Pattern Selection - only visible in tiling mode */}
      {isTilingMode && (
        <>
          <select
            value={selectedPatternId ?? ""}
            onChange={handlePatternChange}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="">Select Pattern...</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>

          {/* Pattern Description */}
          {pattern !== null && (
            <span className="text-xs text-gray-500 max-w-48 truncate" title={pattern.description}>
              {pattern.description}
            </span>
          )}

          {/* Drag Instructions */}
          {pattern !== null && !hasPreview && (
            <span className="text-xs text-purple-600">Drag on canvas to place tiles</span>
          )}

          {/* Preview Info */}
          {hasPreview && (
            <span className="text-xs text-purple-600">
              Preview: {previewGraph.nodes.length} nodes, {previewGraph.edges.length} edges
            </span>
          )}

          {/* Apply/Cancel Buttons */}
          {hasPreview && (
            <>
              <button
                type="button"
                onClick={handleApply}
                className="px-3 py-1.5 text-sm bg-green-500 text-white hover:bg-green-600 rounded transition-colors"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              >
                Cancel
              </button>
            </>
          )}

          {/* Error Display */}
          {error !== null && (
            <span className="text-xs text-red-600" title={error.message}>
              {error.message}
            </span>
          )}
        </>
      )}
    </div>
  );
}
