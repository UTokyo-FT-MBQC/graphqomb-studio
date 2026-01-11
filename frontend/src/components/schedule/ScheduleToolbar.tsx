/**
 * Schedule Toolbar
 *
 * Contains mode selector, action buttons (Auto-fill, Auto-fill Edges, Clear, Apply).
 * Auto-fill uses the existing schedule API and respects locked nodes on frontend.
 * Auto-fill Edges computes entangle times from node prepare times.
 */

"use client";

import { useCallback, useState } from "react";

import { isApiError, schedule, validateSchedule } from "@/lib/api";
import { useProjectStore } from "@/stores/projectStore";
import { type ScheduleMode, useScheduleEditorStore } from "@/stores/scheduleEditorStore";
import { toPayload } from "@/types";

interface ScheduleToolbarProps {
  activeTab: "nodes" | "edges";
}

export function ScheduleToolbar({ activeTab }: ScheduleToolbarProps): React.ReactNode {
  const draftSchedule = useScheduleEditorStore((s) => s.draftSchedule);
  const setMode = useScheduleEditorStore((s) => s.setMode);
  const clearDraft = useScheduleEditorStore((s) => s.clearDraft);
  const autoFillUnlocked = useScheduleEditorStore((s) => s.autoFillUnlocked);
  const autoFillEdges = useScheduleEditorStore((s) => s.autoFillEdges);
  const toScheduleResult = useScheduleEditorStore((s) => s.toScheduleResult);
  const isDirty = useScheduleEditorStore((s) => s.isDirty);
  const validationResult = useScheduleEditorStore((s) => s.validationResult);
  const isValidating = useScheduleEditorStore((s) => s.isValidating);
  const setValidationResult = useScheduleEditorStore((s) => s.setValidationResult);
  const setIsValidating = useScheduleEditorStore((s) => s.setIsValidating);

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

  const handleAutoFillEdges = useCallback(() => {
    autoFillEdges();
    setError(null);
  }, [autoFillEdges]);

  const handleApply = useCallback(() => {
    const result = toScheduleResult();
    if (result) {
      setSchedule(result);
    }
  }, [toScheduleResult, setSchedule]);

  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    setError(null);

    try {
      const payload = toPayload(project);
      const scheduleResult = toScheduleResult();

      if (!scheduleResult) {
        setError("No schedule to validate");
        return;
      }

      const result = await validateSchedule(payload, scheduleResult);
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
  }, [project, toScheduleResult, setValidationResult, setIsValidating]);

  const handleClear = useCallback(() => {
    clearDraft();
    setError(null);
  }, [clearDraft]);

  const hasLockedNodes = draftSchedule
    ? Object.values(draftSchedule.entries).some((e) => e.locked)
    : false;

  const hasLockedEdges = draftSchedule
    ? Object.values(draftSchedule.edgeEntries).some((e) => e.locked)
    : false;

  const lockedNodeCount = draftSchedule
    ? Object.values(draftSchedule.entries).filter((e) => e.locked).length
    : 0;

  const lockedEdgeCount = draftSchedule
    ? Object.values(draftSchedule.edgeEntries).filter((e) => e.locked).length
    : 0;

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
          hasLockedNodes || hasLockedEdges
            ? "Auto-fill will update unlocked items only"
            : "Compute schedule from backend"
        }
      >
        {isAutoFilling ? "Computing..." : "Auto-fill All"}
      </button>

      {/* Auto-fill Edges button - shown when on Edges tab */}
      {activeTab === "edges" && (
        <button
          type="button"
          onClick={handleAutoFillEdges}
          className="px-3 py-1 text-sm font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200 transition-colors"
          title="Compute entangle times from node prepare times: max(prep[source], prep[target])"
        >
          Auto-fill Edges
        </button>
      )}

      <button
        type="button"
        onClick={handleClear}
        className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        title={hasLockedNodes || hasLockedEdges ? "Clear unlocked items only" : "Clear all values"}
      >
        Clear
      </button>

      <button
        type="button"
        onClick={handleValidate}
        disabled={isValidating}
        className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
          isValidating
            ? "bg-amber-100 text-amber-400 cursor-not-allowed"
            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
        }`}
        title="Validate schedule against graph constraints"
      >
        {isValidating ? "Validating..." : "Validate"}
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

      {/* Validation Success Indicator */}
      {validationResult?.valid === true && (
        <span className="text-sm text-green-600 font-medium">Schedule Valid</span>
      )}

      {/* Error Message */}
      {error && <div className="text-sm text-red-600 ml-auto">{error}</div>}

      {/* Status Indicators */}
      <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
        {(hasLockedNodes || hasLockedEdges) && (
          <span className="flex items-center gap-1">
            <span className="text-yellow-500">🔒</span>
            {lockedNodeCount > 0 && `${lockedNodeCount} node${lockedNodeCount > 1 ? "s" : ""}`}
            {lockedNodeCount > 0 && lockedEdgeCount > 0 && ", "}
            {lockedEdgeCount > 0 && `${lockedEdgeCount} edge${lockedEdgeCount > 1 ? "s" : ""}`}
          </span>
        )}
        {isDirty && <span className="text-orange-500 font-medium">Unsaved changes</span>}
      </div>
    </div>
  );
}
