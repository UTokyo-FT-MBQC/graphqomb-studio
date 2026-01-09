/**
 * Working Plane Controls
 *
 * Provides controls for 3D editing working plane:
 * - Edit mode toggle
 * - Plane selection (XY, XZ, YZ)
 * - Plane offset slider
 * - Grid visibility toggle
 */

"use client";

import { type WorkingPlane, useUIStore } from "@/stores/uiStore";

interface AxisRange {
  min: number;
  max: number;
}

interface WorkingPlaneControlsProps {
  axisRanges: {
    x: AxisRange;
    y: AxisRange;
    z: AxisRange;
  };
}

const planeLabels: Record<WorkingPlane, string> = {
  XY: "XY (Z fixed)",
  XZ: "XZ (Y fixed)",
  YZ: "YZ (X fixed)",
};

/**
 * Get the axis range for the fixed axis of a given plane.
 * - XY plane fixes Z
 * - XZ plane fixes Y
 * - YZ plane fixes X
 */
function getPlaneAxisRange(
  plane: WorkingPlane,
  axisRanges: WorkingPlaneControlsProps["axisRanges"]
): AxisRange {
  switch (plane) {
    case "XY":
      return axisRanges.z;
    case "XZ":
      return axisRanges.y;
    case "YZ":
      return axisRanges.x;
  }
}

export function WorkingPlaneControls({ axisRanges }: WorkingPlaneControlsProps): React.ReactNode {
  const is3DEditMode = useUIStore((state) => state.is3DEditMode);
  const toggle3DEditMode = useUIStore((state) => state.toggle3DEditMode);
  const workingPlane = useUIStore((state) => state.workingPlane);
  const setWorkingPlane = useUIStore((state) => state.setWorkingPlane);
  const workingPlaneOffset = useUIStore((state) => state.workingPlaneOffset);
  const setWorkingPlaneOffset = useUIStore((state) => state.setWorkingPlaneOffset);
  const showWorkingPlaneGrid = useUIStore((state) => state.showWorkingPlaneGrid);
  const toggleWorkingPlaneGrid = useUIStore((state) => state.toggleWorkingPlaneGrid);

  // Get the axis range for the currently selected plane
  const { min: minOffset, max: maxOffset } = getPlaneAxisRange(workingPlane, axisRanges);

  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkingPlaneOffset(Number(e.target.value));
  };

  return (
    <div className="flex items-center gap-3">
      {/* Edit Mode Toggle */}
      <button
        type="button"
        onClick={toggle3DEditMode}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          is3DEditMode
            ? "bg-orange-500 text-white hover:bg-orange-600"
            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
        }`}
      >
        {is3DEditMode ? "Exit 3D Edit" : "3D Edit"}
      </button>

      {is3DEditMode && (
        <>
          <div className="h-4 w-px bg-gray-300" />

          {/* Plane Selection */}
          <div className="flex items-center gap-1">
            {(["XY", "XZ", "YZ"] as const).map((plane) => (
              <button
                key={plane}
                type="button"
                onClick={() => setWorkingPlane(plane)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  workingPlane === plane
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
                title={planeLabels[plane]}
              >
                {plane}
              </button>
            ))}
          </div>

          {/* Offset Slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Offset:</span>
            <input
              type="range"
              min={minOffset}
              max={maxOffset}
              step={1}
              value={workingPlaneOffset}
              onChange={handleOffsetChange}
              className="w-20 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              disabled={minOffset === maxOffset}
            />
            <span className="text-xs text-gray-600 w-6 text-center">{workingPlaneOffset}</span>
          </div>

          {/* Grid Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showWorkingPlaneGrid}
              onChange={toggleWorkingPlaneGrid}
              className="w-3 h-3 accent-orange-500"
            />
            <span className="text-xs text-gray-600">Grid</span>
          </label>
        </>
      )}
    </div>
  );
}
