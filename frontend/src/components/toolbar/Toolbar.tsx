/**
 * Toolbar Component
 *
 * Two-row toolbar layout:
 * - Top row: Project info (logo, name, file menu) and actions (validate, schedule)
 * - Bottom row: View controls and editing tools
 */

"use client";

import { FTQCModal } from "@/components/ftqc/FTQCModal";
import { EdgeCreationToolbar } from "@/components/toolbar/EdgeCreationToolbar";
import { FileMenu } from "@/components/toolbar/FileMenu";
import { GhostRangeSlider } from "@/components/toolbar/GhostRangeSlider";
import { NodeCreationToolbar } from "@/components/toolbar/NodeCreationToolbar";
import { TilingToolbar } from "@/components/toolbar/TilingToolbar";
import { ToolbarDivider, ToolbarRow, ToolbarSpacer } from "@/components/toolbar/ToolbarRow";
import { ViewControls } from "@/components/toolbar/ViewControls";
import { WorkingPlaneControls } from "@/components/toolbar/WorkingPlaneControls";
import { ZSliceSlider } from "@/components/toolbar/ZSliceSlider";
import { isApiError, schedule, validate } from "@/lib/api";
import { getAxisRange, getZRange } from "@/lib/geometry";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { toPayload } from "@/types";
import type { ChangeEvent } from "react";
import { useCallback, useMemo, useState } from "react";

interface ValidationState {
  valid: boolean;
  errors: Array<{ type: string; message: string }>;
}

export function Toolbar(): React.ReactNode {
  const project = useProjectStore((state) => state.project);
  const setProjectName = useProjectStore((state) => state.setProjectName);
  const setSchedule = useProjectStore((state) => state.setSchedule);

  const viewMode = useUIStore((state) => state.viewMode);
  const openFTQCModal = useUIStore((state) => state.openFTQCModal);

  // Calculate axis ranges from nodes
  const zRange = useMemo(() => getZRange(project.nodes), [project.nodes]);
  const axisRanges = useMemo(
    () => ({
      x: getAxisRange(project.nodes, "x"),
      y: getAxisRange(project.nodes, "y"),
      z: zRange,
    }),
    [project.nodes, zRange]
  );

  const is2DSliceMode = viewMode === "2d-slice";
  const is3DIsometricMode = viewMode === "3d-isometric";
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationState | null>(null);

  // Handle project name change
  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setProjectName(e.target.value);
    },
    [setProjectName]
  );

  // Handle validate
  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const payload = toPayload(project);
      const result = await validate(payload);
      setValidationResult(result);

      if (!result.valid) {
        const errorMessages = result.errors.map((e) => e.message).join("; ");
        setError(`Validation failed: ${errorMessages}`);
      }
    } catch (err) {
      if (isApiError(err)) {
        setError(`Validation error: ${err.detail}`);
      } else {
        setError(`Validation error: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      setIsValidating(false);
    }
  }, [project]);

  // Handle schedule
  const handleSchedule = useCallback(async () => {
    setIsScheduling(true);
    setError(null);

    try {
      const payload = toPayload(project);
      const result = await schedule(payload);
      setSchedule(result);
    } catch (err) {
      if (isApiError(err)) {
        setError(`Schedule error: ${err.detail}`);
      } else {
        setError(`Schedule error: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      setIsScheduling(false);
    }
  }, [project, setSchedule]);

  const hasNodes = project.nodes.length > 0;

  const handleClearError = useCallback(() => {
    setError(null);
  }, []);

  const handleClearValidation = useCallback(() => {
    setValidationResult(null);
  }, []);

  return (
    <div className="border-b border-gray-200 bg-white">
      {/* Top Row: Project info and actions */}
      <ToolbarRow className="border-b border-gray-100">
        {/* Logo/Title */}
        <h1 className="text-lg font-semibold text-gray-800">GraphQOMB Studio</h1>

        {/* Project Name */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Project:</span>
          <input
            type="text"
            value={project.name}
            onChange={handleNameChange}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <ToolbarDivider />

        {/* File Menu */}
        <FileMenu
          onError={setError}
          onClearError={handleClearError}
          onClearValidation={handleClearValidation}
        />

        <ToolbarSpacer />

        {/* Validate and Schedule Buttons */}
        <button
          type="button"
          onClick={handleValidate}
          disabled={isValidating || !hasNodes}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            isValidating || !hasNodes
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-green-100 hover:bg-green-200 text-green-700"
          }`}
        >
          {isValidating ? "Validating..." : "Validate"}
        </button>

        <button
          type="button"
          onClick={handleSchedule}
          disabled={isScheduling || !hasNodes}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            isScheduling || !hasNodes
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-100 hover:bg-blue-200 text-blue-700"
          }`}
        >
          {isScheduling ? "Scheduling..." : "Schedule"}
        </button>

        <button
          type="button"
          onClick={openFTQCModal}
          disabled={!hasNodes}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            !hasNodes
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-purple-100 hover:bg-purple-200 text-purple-700"
          }`}
        >
          FTQC
        </button>

        {/* Validation Success Indicator */}
        {validationResult?.valid === true && (
          <span className="text-sm text-green-600 font-medium">Valid</span>
        )}

        {/* Error Message */}
        {error !== null && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        <ToolbarDivider />

        {/* Project Info */}
        <div className="text-xs text-gray-400">
          {project.nodes.length} nodes, {project.edges.length} edges
        </div>
      </ToolbarRow>

      {/* Bottom Row: View controls and editing tools */}
      <ToolbarRow>
        {/* View Mode and Display Toggles */}
        <ViewControls />

        <ToolbarDivider />

        {/* Node and Edge Creation */}
        <NodeCreationToolbar />
        <EdgeCreationToolbar />

        <ToolbarDivider />

        {/* Tiling Mode */}
        <TilingToolbar />

        {/* Z-Slice Slider and Ghost Range - only in 2D-slice view */}
        {is2DSliceMode && (
          <>
            <ToolbarDivider />
            <ZSliceSlider minZ={zRange.min} maxZ={zRange.max} />
            <GhostRangeSlider />
          </>
        )}

        {/* Working Plane Controls - only in 3D isometric view */}
        {is3DIsometricMode && (
          <>
            <ToolbarDivider />
            <WorkingPlaneControls axisRanges={axisRanges} />
          </>
        )}
      </ToolbarRow>

      {/* FTQC Modal */}
      <FTQCModal />
    </div>
  );
}
