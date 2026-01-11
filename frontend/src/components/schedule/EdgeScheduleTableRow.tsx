/**
 * Edge Schedule Table Row
 *
 * Individual row with lock toggle, edge info, and entangle time input.
 * Provides bidirectional selection with canvas.
 */

"use client";

import { memo, useCallback } from "react";

import { type DraftEdgeEntry, useScheduleEditorStore } from "@/stores/scheduleEditorStore";
import { useSelectionStore } from "@/stores/selectionStore";

interface EdgeScheduleTableRowProps {
  edgeId: string;
  entry: DraftEdgeEntry | undefined;
  isSelected: boolean;
  maxTime: number;
}

function EdgeScheduleTableRowComponent({
  edgeId,
  entry,
  isSelected,
  maxTime,
}: EdgeScheduleTableRowProps): React.ReactNode {
  const updateEdgeEntry = useScheduleEditorStore((s) => s.updateEdgeEntry);
  const toggleEdgeLock = useScheduleEditorStore((s) => s.toggleEdgeLock);
  const setHoveredEdge = useScheduleEditorStore((s) => s.setHoveredEdge);
  const selectEdgeEntry = useScheduleEditorStore((s) => s.selectEdgeEntry);
  const selectEdge = useSelectionStore((s) => s.selectEdge);

  const handleRowClick = useCallback(() => {
    selectEdgeEntry(edgeId);
    selectEdge(edgeId); // Sync with canvas selection
  }, [edgeId, selectEdgeEntry, selectEdge]);

  const handleMouseEnter = useCallback(() => {
    setHoveredEdge(edgeId);
  }, [edgeId, setHoveredEdge]);

  const handleMouseLeave = useCallback(() => {
    setHoveredEdge(null);
  }, [setHoveredEdge]);

  const handleLockToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleEdgeLock(edgeId);
    },
    [edgeId, toggleEdgeLock]
  );

  const handleEntangleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value === "" ? null : Number.parseInt(e.target.value, 10);
      if (val === null || !Number.isNaN(val)) {
        updateEdgeEntry(edgeId, { entangleTime: val });
      }
    },
    [edgeId, updateEdgeEntry]
  );

  const handleInputClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleRowClick();
      }
    },
    [handleRowClick]
  );

  if (!entry) {
    return null;
  }

  // Calculate timeline marker position
  const markerPosition =
    entry.entangleTime !== null ? (entry.entangleTime / (maxTime + 1)) * 100 : null;

  return (
    <tr
      className={`cursor-pointer transition-colors ${
        isSelected ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
      }`}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      tabIndex={0}
    >
      {/* Lock Toggle */}
      <td className="px-2 py-1.5">
        <button
          type="button"
          onClick={handleLockToggle}
          className={`w-6 h-6 rounded flex items-center justify-center text-sm transition-colors ${
            entry.locked
              ? "bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          }`}
          title={entry.locked ? "Unlock edge" : "Lock edge"}
        >
          {entry.locked ? "🔒" : "🔓"}
        </button>
      </td>

      {/* Edge ID */}
      <td className="px-2 py-1.5">
        <span className="font-mono text-sm">{edgeId}</span>
      </td>

      {/* Source Node */}
      <td className="px-2 py-1.5">
        <span className="font-mono text-xs text-gray-600">{entry.source}</span>
      </td>

      {/* Target Node */}
      <td className="px-2 py-1.5">
        <span className="font-mono text-xs text-gray-600">{entry.target}</span>
      </td>

      {/* Entangle Time Input */}
      <td className="px-2 py-1.5">
        <input
          type="number"
          min="0"
          value={entry.entangleTime ?? ""}
          onChange={handleEntangleTimeChange}
          disabled={entry.locked}
          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-500"
          onClick={handleInputClick}
          placeholder="-"
        />
      </td>

      {/* Mini Timeline Marker */}
      <td className="px-2 py-1.5">
        <div className="relative h-4 w-full min-w-[100px] bg-gray-100 rounded overflow-hidden">
          {/* Time grid markers */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: maxTime + 1 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Static grid dividers that never reorder
              <div key={i} className="flex-1 border-r border-gray-200 last:border-r-0" />
            ))}
          </div>

          {/* Entangle time marker */}
          {markerPosition !== null ? (
            <div
              className={`absolute top-0.5 bottom-0.5 w-2 rounded-sm ${
                entry.locked ? "bg-yellow-500" : "bg-purple-500"
              }`}
              style={{ left: `${markerPosition}%` }}
              title={`Entangle: ${entry.entangleTime}`}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-gray-400">Not scheduled</span>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export const EdgeScheduleTableRow = memo(EdgeScheduleTableRowComponent);
