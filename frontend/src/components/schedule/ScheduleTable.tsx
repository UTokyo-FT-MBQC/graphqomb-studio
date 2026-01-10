/**
 * Schedule Table
 *
 * Table-based input for prepareTime and measureTime per node.
 * Phase 1 implementation (Gantt chart comes in Phase 2).
 */

"use client";

import { useMemo } from "react";

import { useProjectStore } from "@/stores/projectStore";
import { useScheduleEditorStore } from "@/stores/scheduleEditorStore";

import { ScheduleTableRow } from "./ScheduleTableRow";

export function ScheduleTable(): React.ReactNode {
  const draftSchedule = useScheduleEditorStore((s) => s.draftSchedule);
  const selectedEntryId = useScheduleEditorStore((s) => s.selectedEntryId);
  const nodes = useProjectStore((s) => s.project.nodes);

  // Get non-output nodes (output nodes don't have schedules)
  const schedulableNodes = useMemo(() => nodes.filter((n) => n.role !== "output"), [nodes]);

  // Calculate max time for visual reference in mini timeline
  const maxTime = useMemo(() => {
    if (!draftSchedule) return 0;
    let max = 0;
    for (const entry of Object.values(draftSchedule.entries)) {
      if (entry.prepareTime !== null) max = Math.max(max, entry.prepareTime);
      if (entry.measureTime !== null) max = Math.max(max, entry.measureTime);
    }
    return Math.max(max, 1); // Minimum 1 for display
  }, [draftSchedule]);

  if (!draftSchedule) {
    return null;
  }

  return (
    <div className="overflow-x-auto max-h-48 border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-2 py-2 text-left w-10 text-xs font-medium text-gray-500 uppercase">
              Lock
            </th>
            <th className="px-2 py-2 text-left w-20 text-xs font-medium text-gray-500 uppercase">
              Node
            </th>
            <th className="px-2 py-2 text-left w-20 text-xs font-medium text-gray-500 uppercase">
              Role
            </th>
            <th className="px-2 py-2 text-left w-24 text-xs font-medium text-gray-500 uppercase">
              Prep
            </th>
            <th className="px-2 py-2 text-left w-24 text-xs font-medium text-gray-500 uppercase">
              Meas
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Timeline
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {schedulableNodes.map((node) => (
            <ScheduleTableRow
              key={node.id}
              nodeId={node.id}
              role={node.role}
              entry={draftSchedule.entries[node.id]}
              isSelected={selectedEntryId === node.id}
              maxTime={maxTime}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
