/**
 * Toolbar Component
 *
 * Main toolbar with:
 * - New: Reset project
 * - Import: Load JSON file
 * - Export: Download JSON file
 * - Validate: Validate graph and flow (API call)
 * - Schedule: Compute measurement schedule (API call)
 */

"use client";

import { EdgeCreationToolbar } from "@/components/toolbar/EdgeCreationToolbar";
import { ViewControls } from "@/components/toolbar/ViewControls";
import { WorkingPlaneControls } from "@/components/toolbar/WorkingPlaneControls";
import { ZSliceSlider } from "@/components/toolbar/ZSliceSlider";
import { isApiError, schedule, validate } from "@/lib/api";
import { getAxisRange, getZRange } from "@/lib/geometry";
import { downloadProject, safeParseProject } from "@/lib/validation";
import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUIStore } from "@/stores/uiStore";
import { toPayload } from "@/types";
import type { ChangeEvent } from "react";
import { useCallback, useMemo, useRef, useState } from "react";

interface ValidationState {
  valid: boolean;
  errors: Array<{ type: string; message: string }>;
}

export function Toolbar(): React.ReactNode {
  const project = useProjectStore((state) => state.project);
  const setProject = useProjectStore((state) => state.setProject);
  const reset = useProjectStore((state) => state.reset);
  const setProjectName = useProjectStore((state) => state.setProjectName);
  const setSchedule = useProjectStore((state) => state.setSchedule);
  const clearSelection = useSelectionStore((state) => state.clearSelection);

  const viewMode = useUIStore((state) => state.viewMode);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const is3DSliceMode = project.dimension === 3 && viewMode === "2d-slice";
  const is3DIsometricMode = project.dimension === 3 && viewMode === "3d-isometric";
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationState | null>(null);

  // Handle new project
  const handleNew = useCallback(() => {
    if (project.nodes.length > 0) {
      const confirmed = window.confirm(
        "Are you sure you want to create a new project? All unsaved changes will be lost."
      );
      if (!confirmed) return;
    }
    reset();
    clearSelection();
    setError(null);
    setValidationResult(null);
  }, [project.nodes.length, reset, clearSelection]);

  // Handle import
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file === undefined) return;

      try {
        const text = await file.text();
        const result = safeParseProject(text);

        if (result.success) {
          setProject(result.data);
          clearSelection();
          setError(null);
          setValidationResult(null);
        } else {
          setError(`Invalid project file: ${result.error.message}`);
        }
      } catch (err) {
        setError(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`);
      }

      // Reset file input
      if (fileInputRef.current !== null) {
        fileInputRef.current.value = "";
      }
    },
    [setProject, clearSelection]
  );

  // Handle export
  const handleExport = useCallback(() => {
    downloadProject(project);
    setError(null);
  }, [project]);

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

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-200 bg-white">
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

      {/* Divider */}
      <div className="h-6 w-px bg-gray-300" />

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleNew}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          New
        </button>

        <button
          type="button"
          onClick={handleImportClick}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={handleExport}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Export
        </button>

        <div className="h-6 w-px bg-gray-300" />

        {/* Flow View Controls */}
        <ViewControls />

        <div className="h-6 w-px bg-gray-300" />

        {/* Edge Creation Mode */}
        <EdgeCreationToolbar />

        {/* Z-Slice Slider - only in 3D mode with 2D-slice view */}
        {is3DSliceMode && (
          <>
            <div className="h-6 w-px bg-gray-300" />
            <ZSliceSlider minZ={zRange.min} maxZ={zRange.max} />
          </>
        )}

        {/* Working Plane Controls - only in 3D isometric view */}
        {is3DIsometricMode && (
          <>
            <div className="h-6 w-px bg-gray-300" />
            <WorkingPlaneControls axisRanges={axisRanges} />
          </>
        )}

        <div className="h-6 w-px bg-gray-300" />

        {/* Validate Button */}
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

        {/* Schedule Button */}
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

        {/* Validation Success Indicator */}
        {validationResult?.valid === true && (
          <span className="text-sm text-green-600 font-medium">Valid</span>
        )}
      </div>

      {/* Error Message */}
      {error !== null && (
        <div className="ml-auto flex items-center gap-2">
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

      {/* Project Info */}
      <div className="ml-auto text-xs text-gray-400">
        {project.nodes.length} nodes, {project.edges.length} edges
      </div>
    </div>
  );
}
