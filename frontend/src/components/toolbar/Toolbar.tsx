/**
 * Toolbar Component
 *
 * Main toolbar with:
 * - New: Reset project
 * - Import: Load JSON file
 * - Export: Download JSON file
 * - Validate: (disabled - Phase 3)
 * - Schedule: (disabled - Phase 3)
 */

"use client";

import { ViewControls } from "@/components/toolbar/ViewControls";
import { downloadProject, safeParseProject } from "@/lib/validation";
import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import type { ChangeEvent } from "react";
import { useCallback, useRef, useState } from "react";

export function Toolbar(): React.ReactNode {
  const project = useProjectStore((state) => state.project);
  const setProject = useProjectStore((state) => state.setProject);
  const reset = useProjectStore((state) => state.reset);
  const setProjectName = useProjectStore((state) => state.setProjectName);
  const clearSelection = useSelectionStore((state) => state.clearSelection);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

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

        {/* Disabled buttons for Phase 3 */}
        <button
          type="button"
          disabled
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-400 rounded cursor-not-allowed"
          title="Available in Phase 3"
        >
          Validate
        </button>

        <button
          type="button"
          disabled
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-400 rounded cursor-not-allowed"
          title="Available in Phase 3"
        >
          Schedule
        </button>
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
