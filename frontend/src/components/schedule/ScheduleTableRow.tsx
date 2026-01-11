/**
 * Schedule Table Row
 *
 * Individual row with lock toggle, time inputs, and mini timeline bar.
 * Provides bidirectional selection with canvas.
 */

"use client";

import { memo, useCallback } from "react";

import { type DraftScheduleEntry, useScheduleEditorStore } from "@/stores/scheduleEditorStore";
import { useSelectionStore } from "@/stores/selectionStore";
import type { NodeRole } from "@/types";

import { MiniTimelineBar } from "./MiniTimelineBar";

interface ScheduleTableRowProps {
  nodeId: string;
  role: NodeRole;
  entry: DraftScheduleEntry | undefined;
  isSelected: boolean;
  maxTime: number;
}

const roleColors: Record<NodeRole, string> = {
  input: "bg-green-100 text-green-700",
  output: "bg-blue-100 text-blue-700",
  intermediate: "bg-gray-100 text-gray-700",
};

function ScheduleTableRowComponent({
  nodeId,
  role,
  entry,
  isSelected,
  maxTime,
}: ScheduleTableRowProps): React.ReactNode {
  const updateEntry = useScheduleEditorStore((s) => s.updateEntry);
  const toggleLock = useScheduleEditorStore((s) => s.toggleLock);
  const setHoveredNode = useScheduleEditorStore((s) => s.setHoveredNode);
  const selectEntry = useScheduleEditorStore((s) => s.selectEntry);
  const selectNode = useSelectionStore((s) => s.selectNode);

  const handleRowClick = useCallback(() => {
    selectEntry(nodeId);
    selectNode(nodeId); // Sync with canvas selection
  }, [nodeId, selectEntry, selectNode]);

  const handleMouseEnter = useCallback(() => {
    setHoveredNode(nodeId);
  }, [nodeId, setHoveredNode]);

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, [setHoveredNode]);

  const handleLockToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleLock(nodeId);
    },
    [nodeId, toggleLock]
  );

  const handlePrepareTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value === "" ? null : Number.parseInt(e.target.value, 10);
      if (val === null || !Number.isNaN(val)) {
        updateEntry(nodeId, { prepareTime: val });
      }
    },
    [nodeId, updateEntry]
  );

  const handleMeasureTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value === "" ? null : Number.parseInt(e.target.value, 10);
      if (val === null || !Number.isNaN(val)) {
        updateEntry(nodeId, { measureTime: val });
      }
    },
    [nodeId, updateEntry]
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
          title={entry.locked ? "Unlock node" : "Lock node"}
        >
          {entry.locked ? "🔒" : "🔓"}
        </button>
      </td>

      {/* Node ID */}
      <td className="px-2 py-1.5">
        <span className="font-mono text-sm">{nodeId}</span>
      </td>

      {/* Role */}
      <td className="px-2 py-1.5">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleColors[role]}`}>
          {role}
        </span>
      </td>

      {/* Prepare Time Input */}
      <td className="px-2 py-1.5">
        <input
          type="number"
          min="0"
          value={entry.prepareTime ?? ""}
          onChange={handlePrepareTimeChange}
          disabled={entry.locked}
          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-500"
          onClick={handleInputClick}
          placeholder="-"
        />
      </td>

      {/* Measure Time Input (disabled for output nodes) */}
      <td className="px-2 py-1.5">
        <input
          type="number"
          min="0"
          value={entry.measureTime ?? ""}
          onChange={handleMeasureTimeChange}
          disabled={entry.locked || role === "output"}
          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-500"
          onClick={handleInputClick}
          placeholder={role === "output" ? "N/A" : "-"}
          title={role === "output" ? "Output nodes are not measured" : undefined}
        />
      </td>

      {/* Mini Timeline Bar */}
      <td className="px-2 py-1.5">
        <MiniTimelineBar
          prepareTime={entry.prepareTime}
          measureTime={entry.measureTime}
          maxTime={maxTime}
          locked={entry.locked}
        />
      </td>
    </tr>
  );
}

export const ScheduleTableRow = memo(ScheduleTableRowComponent);
