/**
 * Schedule Toolbar
 *
 * Contains mode selector, action buttons (Auto-fill, Clear, Apply).
 * Auto-fill uses the existing schedule API and respects locked nodes on frontend.
 */

"use client";

import { useCallback, useState } from "react";

import { isApiError, schedule } from "@/lib/api";
import { useProjectStore } from "@/stores/projectStore";
import { type ScheduleMode, useScheduleEditorStore } from "@/stores/scheduleEditorStore";
import { toPayload } from "@/types";

export function ScheduleToolbar(): React.ReactNode {
  const draftSchedule = useScheduleEditorStore((s) => s.draftSchedule);
  const setMode = useScheduleEditorStore((s) => s.setMode);
  const clearDraft = useScheduleEditorStore((s) => s.clearDraft);
  const autoFillUnlocked = useScheduleEditorStore((s) => s.autoFillUnlocked);
  const toScheduleResult = useScheduleEditorStore((s) => s.toScheduleResult);
  const isDirty = useScheduleEditorStore((s) => s.isDirty);

  const project = useProjectStore((s) => s.project);
  const setSchedule = useProjectStore((s) => s.setSchedule);

  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAutoFill = useCallback(async () => {
    setIsAutoFilling(true);
    setError(null);

    try {
      const payload = toPayload(project);
      const result = await schedule(payload);
      autoFillUnlocked(result);
    } catch (err) {
      if (isApiError(err)) {
        setError(`Auto-fill failed: ${err.detail}`);
      } else {
        setError("Auto-fill failed: Unknown error");
      }
    } finally {
      setIsAutoFilling(false);
    }
  }, [project, autoFillUnlocked]);

  const handleApply = useCallback(() => {
    const result = toScheduleResult();
    if (result) {
      setSchedule(result);
    }
  }, [toScheduleResult, setSchedule]);

  const handleClear = useCallback(() => {
    clearDraft();
    setError(null);
  }, [clearDraft]);

  const hasLockedNodes = draftSchedule
    ? Object.values(draftSchedule.entries).some((e) => e.locked)
    : false;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Mode Selector */}
      <div className="flex items-center gap-2">
        <label htmlFor="schedule-mode" className="text-sm text-gray-600">
          Mode:
        </label>
        <select
          id="schedule-mode"
          value={draftSchedule?.mode ?? "manual"}
          onChange={(e) => setMode(e.target.value as ScheduleMode)}
          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="manual">Manual</option>
          <option value="auto">Auto</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-200" />

      {/* Action Buttons */}
      <button
        type="button"
        onClick={handleAutoFill}
        disabled={isAutoFilling}
        className="px-3 py-1 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
        title={
          hasLockedNodes
            ? "Auto-fill will update unlocked nodes only"
            : "Compute schedule from backend"
        }
      >
        {isAutoFilling ? "Computing..." : "Auto-fill"}
      </button>

      <button
        type="button"
        onClick={handleClear}
        className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        title={hasLockedNodes ? "Clear unlocked nodes only" : "Clear all values"}
      >
        Clear
      </button>

      <button
        type="button"
        onClick={handleApply}
        disabled={!isDirty}
        className="px-3 py-1 text-sm font-medium text-white bg-green-500 rounded hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
        title="Apply schedule to project"
      >
        Apply
      </button>

      {/* Error Message */}
      {error && <div className="text-sm text-red-600 ml-auto">{error}</div>}

      {/* Status Indicators */}
      <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
        {hasLockedNodes && (
          <span className="flex items-center gap-1">
            <span className="text-yellow-500">🔒</span>
            {Object.values(draftSchedule?.entries ?? {}).filter((e) => e.locked).length} locked
          </span>
        )}
        {isDirty && <span className="text-orange-500 font-medium">Unsaved changes</span>}
      </div>
    </div>
  );
}
