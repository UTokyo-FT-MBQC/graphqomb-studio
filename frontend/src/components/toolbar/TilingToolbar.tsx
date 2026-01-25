/**
 * Tiling Toolbar Component
 *
 * UI for tiling feature:
 * - Toggle 2D tiling mode (drag-based)
 * - Select pattern from presets
 * - Apply/Cancel preview
 * - Open 3D tiling dialog (dialog-based)
 */

"use client";

import { getAvailable2DPresets, useTilingStore } from "@/stores/tilingStore";
import { useUIStore } from "@/stores/uiStore";
import { useCallback, useMemo } from "react";

export function TilingToolbar(): React.ReactNode {
  const isTilingMode = useUIStore((state) => state.isTilingMode);
  const setTilingMode = useUIStore((state) => state.setTilingMode);
  const open3DTilingDialog = useUIStore((state) => state.open3DTilingDialog);

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

  const handleOpen3DDialog = useCallback(() => {
    open3DTilingDialog();
  }, [open3DTilingDialog]);

  const hasPreview = previewGraph !== null && previewGraph.nodes.length > 0;

  return (
    <div className="flex items-center gap-2">
      {/* 2D Tiling Mode Toggle */}
      <button
        type="button"
        onClick={handleToggleTilingMode}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          isTilingMode
            ? "bg-purple-500 text-white hover:bg-purple-600"
            : "bg-purple-100 hover:bg-purple-200 text-purple-700"
        }`}
        title="2D tiling with drag interaction"
      >
        {isTilingMode ? "Exit Tiling" : "2D Tiling"}
      </button>

      {/* 3D Tiling Dialog Button */}
      <button
        type="button"
        onClick={handleOpen3DDialog}
        className="px-3 py-1.5 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded transition-colors"
        title="3D tiling with dialog input"
      >
        3D Tiling
      </button>

      {/* Pattern Selection - only visible in 2D tiling mode */}
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
