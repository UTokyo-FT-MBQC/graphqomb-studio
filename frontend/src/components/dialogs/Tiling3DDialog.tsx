/**
 * 3D Tiling Dialog Component
 *
 * Dialog for configuring and applying 3D tiling patterns (Cubic Grid, RHG Lattice).
 * Uses dialog-based input for Lx, Ly, Lz dimensions instead of drag-based interaction.
 */

"use client";

import { MAX_RECOMMENDED_NODES } from "@/lib/tiling/generator";
import { useTilingStore } from "@/stores/tilingStore";
import { useUIStore } from "@/stores/uiStore";
import type { Tiling3DPatternId } from "@/types/rhg";
import { useCallback, useEffect } from "react";

/**
 * Pattern information for display.
 */
const PATTERN_INFO: Record<Tiling3DPatternId, { name: string; description: string }> = {
  cubic: {
    name: "3D Cubic Grid",
    description: "Simple cubic lattice with nodes at vertices connected to 6 neighbors.",
  },
  rhg: {
    name: "RHG Lattice",
    description:
      "Raussendorf-Harrington-Goyal lattice for fault-tolerant MBQC. Qubits on faces and edges of cubic cells.",
  },
};

export function Tiling3DDialog(): React.ReactNode {
  const isOpen = useUIStore((state) => state.is3DTilingDialogOpen);
  const close3DTilingDialog = useUIStore((state) => state.close3DTilingDialog);

  const params3D = useTilingStore((state) => state.params3D);
  const preview3D = useTilingStore((state) => state.preview3D);
  const error3D = useTilingStore((state) => state.error3D);
  const estimatedNodeCount3D = useTilingStore((state) => state.estimatedNodeCount3D);
  const estimatedEdgeCount3D = useTilingStore((state) => state.estimatedEdgeCount3D);
  const setParams3D = useTilingStore((state) => state.setParams3D);
  const generatePreview3D = useTilingStore((state) => state.generatePreview3D);
  const applyTiling3D = useTilingStore((state) => state.applyTiling3D);
  const clearTiling3D = useTilingStore((state) => state.clearTiling3D);

  const isOverLimit = estimatedNodeCount3D > MAX_RECOMMENDED_NODES;
  const hasPreview = preview3D !== null && preview3D.nodes.length > 0;

  // Auto-generate preview when dialog opens or params change
  useEffect(() => {
    if (isOpen && !isOverLimit) {
      generatePreview3D();
    }
  }, [isOpen, isOverLimit, generatePreview3D, params3D]);

  const handlePatternChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setParams3D({ patternId: e.target.value as Tiling3DPatternId });
    },
    [setParams3D]
  );

  const handleDimensionChange = useCallback(
    (dimension: "Lx" | "Ly" | "Lz", value: string) => {
      const numValue = Math.max(1, Math.min(10, Number.parseInt(value, 10) || 1));
      setParams3D({ [dimension]: numValue });
    },
    [setParams3D]
  );

  const handleOriginChange = useCallback(
    (axis: "originX" | "originY" | "originZ", value: string) => {
      const numValue = Number.parseInt(value, 10) || 0;
      setParams3D({ [axis]: numValue });
    },
    [setParams3D]
  );

  const handleApply = useCallback(() => {
    applyTiling3D();
    close3DTilingDialog();
  }, [applyTiling3D, close3DTilingDialog]);

  const handleCancel = useCallback(() => {
    clearTiling3D();
    close3DTilingDialog();
  }, [clearTiling3D, close3DTilingDialog]);

  if (!isOpen) {
    return null;
  }

  const patternInfo = PATTERN_INFO[params3D.patternId];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[420px] max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">3D Tiling</h2>
          <p className="text-sm text-gray-500 mt-1">Generate 3D graph structures</p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Pattern Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pattern
              <select
                value={params3D.patternId}
                onChange={handlePatternChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="cubic">{PATTERN_INFO.cubic.name}</option>
                <option value="rhg">{PATTERN_INFO.rhg.name}</option>
              </select>
            </label>
            <p className="text-xs text-gray-500 mt-1">{patternInfo.description}</p>
          </div>

          {/* Dimensions */}
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">Dimensions (cells)</span>
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="block text-xs text-gray-500 mb-1">Lx</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={params3D.Lx}
                  onChange={(e) => handleDimensionChange("Lx", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </label>
              <label className="block">
                <span className="block text-xs text-gray-500 mb-1">Ly</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={params3D.Ly}
                  onChange={(e) => handleDimensionChange("Ly", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </label>
              <label className="block">
                <span className="block text-xs text-gray-500 mb-1">Lz</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={params3D.Lz}
                  onChange={(e) => handleDimensionChange("Lz", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </label>
            </div>
          </div>

          {/* Origin Offset */}
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">Origin Offset</span>
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="block text-xs text-gray-500 mb-1">X</span>
                <input
                  type="number"
                  value={params3D.originX}
                  onChange={(e) => handleOriginChange("originX", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </label>
              <label className="block">
                <span className="block text-xs text-gray-500 mb-1">Y</span>
                <input
                  type="number"
                  value={params3D.originY}
                  onChange={(e) => handleOriginChange("originY", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </label>
              <label className="block">
                <span className="block text-xs text-gray-500 mb-1">Z</span>
                <input
                  type="number"
                  value={params3D.originZ}
                  onChange={(e) => handleOriginChange("originZ", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </label>
            </div>
          </div>

          {/* Preview Info */}
          <div className="p-3 bg-gray-50 rounded-md">
            <div className="text-sm">
              <span className="font-medium">Estimated: </span>
              <span className={isOverLimit ? "text-red-600 font-medium" : "text-gray-700"}>
                {estimatedNodeCount3D} nodes, {estimatedEdgeCount3D} edges
              </span>
            </div>
            {isOverLimit && (
              <p className="text-xs text-red-600 mt-1">
                Exceeds limit of {MAX_RECOMMENDED_NODES} nodes. Reduce dimensions.
              </p>
            )}
            {hasPreview && !isOverLimit && (
              <p className="text-xs text-green-600 mt-1">Preview generated successfully.</p>
            )}
          </div>

          {/* Error Display */}
          {error3D !== null && (
            <div className="p-3 bg-red-50 rounded-md">
              <p className="text-sm text-red-600">{error3D.message}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isOverLimit || !hasPreview}
            className="px-4 py-2 text-sm text-white bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
