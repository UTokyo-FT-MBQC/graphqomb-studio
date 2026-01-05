/**
 * Timeline View Component
 *
 * Visualizes the ScheduleResult as a horizontal timeline.
 * Shows prepare, entangle, and measure operations per time step.
 */

"use client";

import { useProjectStore } from "@/stores/projectStore";
import type { TimeSlice } from "@/types";
import type { ReactNode } from "react";

interface TimeSliceCardProps {
  slice: TimeSlice;
}

function TimeSliceCard({ slice }: TimeSliceCardProps): ReactNode {
  const hasPrepare = slice.prepareNodes.length > 0;
  const hasEntangle = slice.entangleEdges.length > 0;
  const hasMeasure = slice.measureNodes.length > 0;
  const isEmpty = !hasPrepare && !hasEntangle && !hasMeasure;

  return (
    <div className="flex-shrink-0 w-36 border border-gray-200 rounded bg-white shadow-sm">
      {/* Time Header */}
      <div className="px-2 py-1 bg-gray-100 border-b border-gray-200 text-center">
        <span className="text-xs font-semibold text-gray-600">T = {slice.time}</span>
      </div>

      {/* Operations */}
      <div className="p-2 space-y-1.5 min-h-[60px]">
        {/* Prepare nodes */}
        {hasPrepare && (
          <div>
            <span className="text-xs text-purple-600 font-medium">Prep: </span>
            <span className="text-xs text-gray-700">{slice.prepareNodes.join(", ")}</span>
          </div>
        )}

        {/* Entangle edges */}
        {hasEntangle && (
          <div>
            <span className="text-xs text-orange-600 font-medium">Ent: </span>
            <span className="text-xs text-gray-700">{slice.entangleEdges.join(", ")}</span>
          </div>
        )}

        {/* Measure nodes */}
        {hasMeasure && (
          <div>
            <span className="text-xs text-green-600 font-medium">Meas: </span>
            <span className="text-xs text-gray-700">{slice.measureNodes.join(", ")}</span>
          </div>
        )}

        {/* Empty slice */}
        {isEmpty && <div className="text-xs text-gray-400 italic">Empty</div>}
      </div>
    </div>
  );
}

export function TimelineView(): ReactNode {
  const schedule = useProjectStore((state) => state.project.schedule);

  // No schedule computed yet
  if (schedule === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-400">
          No schedule computed. Click &quot;Schedule&quot; to generate timeline.
        </p>
      </div>
    );
  }

  // Empty timeline
  if (schedule.timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-400">Schedule is empty.</p>
      </div>
    );
  }

  // Calculate statistics
  const numNodes = Object.keys(schedule.prepareTime).length;
  const numEdges = Object.keys(schedule.entangleTime).length;
  const numSteps = schedule.timeline.length;

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex items-start gap-3 p-3 min-w-max">
        {/* Timeline Label */}
        <div className="flex-shrink-0 w-20 pt-6">
          <div className="text-xs font-medium text-gray-500 text-right">Timeline</div>
          <div className="text-xs text-gray-400 text-right mt-1">{numSteps} steps</div>
        </div>

        {/* Time Slices */}
        <div className="flex gap-2">
          {schedule.timeline.map((slice) => (
            <TimeSliceCard key={slice.time} slice={slice} />
          ))}
        </div>

        {/* Summary */}
        <div className="flex-shrink-0 w-28 pt-4 pl-4 border-l border-gray-200">
          <div className="text-xs font-medium text-gray-500 mb-2">Summary</div>
          <div className="space-y-1">
            <div className="text-xs text-gray-600">
              <span className="text-purple-600">Prep:</span> {numNodes} nodes
            </div>
            <div className="text-xs text-gray-600">
              <span className="text-orange-600">Ent:</span> {numEdges} edges
            </div>
            <div className="text-xs text-gray-600">
              <span className="text-green-600">Meas:</span> {numNodes} nodes
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
