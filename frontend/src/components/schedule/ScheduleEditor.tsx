/**
 * Schedule Editor Component
 *
 * Expandable panel for manual schedule editing.
 * Positioned between canvas and TimelineView footer.
 * Shows warning banner for non-2D-projection modes.
 */

"use client";

import { useEffect, useMemo } from "react";

import { useProjectStore } from "@/stores/projectStore";
import { useScheduleEditorStore } from "@/stores/scheduleEditorStore";
import { useUIStore } from "@/stores/uiStore";

import { ScheduleTable } from "./ScheduleTable";
import { ScheduleToolbar } from "./ScheduleToolbar";

export function ScheduleEditor(): React.ReactNode {
  const isEditorOpen = useScheduleEditorStore((s) => s.isEditorOpen);
  const toggleEditor = useScheduleEditorStore((s) => s.toggleEditor);
  const initializeDraft = useScheduleEditorStore((s) => s.initializeDraft);
  const draftSchedule = useScheduleEditorStore((s) => s.draftSchedule);
  const reset = useScheduleEditorStore((s) => s.reset);

  const viewMode = useUIStore((s) => s.viewMode);
  const nodes = useProjectStore((s) => s.project.nodes);
  const schedule = useProjectStore((s) => s.project.schedule);

  // Filter to non-output nodes (output nodes are not measured)
  const schedulableNodeIds = useMemo(
    () => nodes.filter((n) => n.role !== "output").map((n) => n.id),
    [nodes]
  );

  // Initialize draft when editor opens (if not already initialized)
  useEffect(() => {
    if (isEditorOpen && !draftSchedule) {
      initializeDraft(schedulableNodeIds, schedule);
    }
  }, [isEditorOpen, draftSchedule, schedulableNodeIds, schedule, initializeDraft]);

  // Reset draft when nodes change significantly
  useEffect(() => {
    if (draftSchedule) {
      const draftNodeIds = new Set(Object.keys(draftSchedule.entries));
      const currentNodeIds = new Set(schedulableNodeIds);

      // Check if nodes have changed
      const hasNewNodes = schedulableNodeIds.some((id) => !draftNodeIds.has(id));
      const hasRemovedNodes = Array.from(draftNodeIds).some((id) => !currentNodeIds.has(id));

      if (hasNewNodes || hasRemovedNodes) {
        // Reinitialize with current nodes, preserving existing values where possible
        initializeDraft(schedulableNodeIds, schedule);
      }
    }
  }, [schedulableNodeIds, draftSchedule, schedule, initializeDraft]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const showWarningBanner = viewMode !== "2d-projection" && isEditorOpen;
  const hasSchedulableNodes = schedulableNodeIds.length > 0;

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Header with expand/collapse toggle */}
      <button
        type="button"
        onClick={toggleEditor}
        className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">
          Schedule Editor
          {isEditorOpen && draftSchedule && (
            <span className="ml-2 text-xs text-gray-400">
              ({Object.keys(draftSchedule.entries).length} nodes)
            </span>
          )}
        </span>
        <span className="text-gray-400">{isEditorOpen ? "▼" : "▶"}</span>
      </button>

      {isEditorOpen && (
        <div className="p-4">
          {showWarningBanner ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
              <span className="font-medium">Note:</span> Schedule editing in progress. Switch to{" "}
              <strong>XY Projection</strong> view for full canvas highlighting support.
            </div>
          ) : !hasSchedulableNodes ? (
            <div className="text-sm text-gray-500 text-center py-4">
              No schedulable nodes. Add input or intermediate nodes to edit the schedule.
            </div>
          ) : (
            <>
              <ScheduleToolbar />
              <ScheduleTable />
            </>
          )}
        </div>
      )}
    </div>
  );
}
