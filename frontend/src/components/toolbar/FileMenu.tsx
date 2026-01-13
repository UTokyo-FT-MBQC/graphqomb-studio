/**
 * FileMenu Component
 *
 * Dropdown menu for file operations:
 * - New: Reset project
 * - Import: Load JSON file
 * - Export: Download JSON file
 */

"use client";

import { DropdownMenu, type DropdownMenuItem } from "@/components/ui/DropdownMenu";
import { downloadProject, safeParseProject } from "@/lib/validation";
import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import type { ChangeEvent } from "react";
import { useCallback, useRef } from "react";

interface FileMenuProps {
  onError: (error: string) => void;
  onClearError: () => void;
  onClearValidation: () => void;
}

export function FileMenu({
  onError,
  onClearError,
  onClearValidation,
}: FileMenuProps): React.ReactNode {
  const project = useProjectStore((state) => state.project);
  const setProject = useProjectStore((state) => state.setProject);
  const reset = useProjectStore((state) => state.reset);
  const clearSelection = useSelectionStore((state) => state.clearSelection);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    onClearError();
    onClearValidation();
  }, [project.nodes.length, reset, clearSelection, onClearError, onClearValidation]);

  // Handle import click
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file change
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
          onClearError();
          onClearValidation();
        } else {
          onError(`Invalid project file: ${result.error.message}`);
        }
      } catch (err) {
        onError(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`);
      }

      // Reset file input
      if (fileInputRef.current !== null) {
        fileInputRef.current.value = "";
      }
    },
    [setProject, clearSelection, onError, onClearError, onClearValidation]
  );

  // Handle export
  const handleExport = useCallback(() => {
    downloadProject(project);
    onClearError();
  }, [project, onClearError]);

  const menuItems: DropdownMenuItem[] = [
    { label: "New", onClick: handleNew },
    { label: "Import", onClick: handleImportClick },
    { label: "Export", onClick: handleExport },
  ];

  return (
    <>
      <DropdownMenu trigger="File" items={menuItems} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}
