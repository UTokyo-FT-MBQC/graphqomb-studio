/**
 * Edge Schedule Table
 *
 * Table-based input for entangleTime per edge.
 */

"use client";

import { useMemo } from "react";

import { useProjectStore } from "@/stores/projectStore";
import { useScheduleEditorStore } from "@/stores/scheduleEditorStore";

import { EdgeScheduleTableRow } from "./EdgeScheduleTableRow";

export function EdgeScheduleTable(): React.ReactNode {
  const draftSchedule = useScheduleEditorStore((s) => s.draftSchedule);
  const selectedEdgeEntryId = useScheduleEditorStore((s) => s.selectedEdgeEntryId);
  const edges = useProjectStore((s) => s.project.edges);

  // Calculate max time for visual reference in mini timeline
  const maxTime = useMemo(() => {
    if (!draftSchedule) return 0;
    let max = 0;

    // Include node times
    for (const entry of Object.values(draftSchedule.entries)) {
      if (entry.prepareTime !== null) max = Math.max(max, entry.prepareTime);
      if (entry.measureTime !== null) max = Math.max(max, entry.measureTime);
    }

    // Include edge times
    for (const entry of Object.values(draftSchedule.edgeEntries)) {
      if (entry.entangleTime !== null) max = Math.max(max, entry.entangleTime);
    }

    return Math.max(max, 1); // Minimum 1 for display
  }, [draftSchedule]);

  if (!draftSchedule) {
    return null;
  }

  if (edges.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No edges in the graph. Add edges to schedule entanglement operations.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-48 border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-2 py-2 text-left w-10 text-xs font-medium text-gray-500 uppercase">
              Lock
            </th>
            <th className="px-2 py-2 text-left w-28 text-xs font-medium text-gray-500 uppercase">
              Edge
            </th>
            <th className="px-2 py-2 text-left w-16 text-xs font-medium text-gray-500 uppercase">
              Src
            </th>
            <th className="px-2 py-2 text-left w-16 text-xs font-medium text-gray-500 uppercase">
              Tgt
            </th>
            <th className="px-2 py-2 text-left w-24 text-xs font-medium text-gray-500 uppercase">
              Entangle
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Timeline
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {edges.map((edge) => (
            <EdgeScheduleTableRow
              key={edge.id}
              edgeId={edge.id}
              entry={draftSchedule.edgeEntries[edge.id]}
              isSelected={selectedEdgeEntryId === edge.id}
              maxTime={maxTime}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
