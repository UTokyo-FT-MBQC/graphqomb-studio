/**
 * Schedule Editor Component
 *
 * Expandable panel for manual schedule editing.
 * Positioned between canvas and TimelineView footer.
 * Shows warning banner for non-2D-projection modes.
 * Contains tabs for Nodes and Edges scheduling.
 */

"use client";

import { useEffect, useMemo, useState } from "react";

import { useProjectStore } from "@/stores/projectStore";
import { useScheduleEditorStore } from "@/stores/scheduleEditorStore";
import { useUIStore } from "@/stores/uiStore";

import { EdgeScheduleTable } from "./EdgeScheduleTable";
import { ScheduleTable } from "./ScheduleTable";
import { ScheduleToolbar } from "./ScheduleToolbar";

type ScheduleTab = "nodes" | "edges";

export function ScheduleEditor(): React.ReactNode {
  const isEditorOpen = useScheduleEditorStore((s) => s.isEditorOpen);
  const toggleEditor = useScheduleEditorStore((s) => s.toggleEditor);
  const initializeDraft = useScheduleEditorStore((s) => s.initializeDraft);
  const draftSchedule = useScheduleEditorStore((s) => s.draftSchedule);
  const reset = useScheduleEditorStore((s) => s.reset);

  const viewMode = useUIStore((s) => s.viewMode);
  const nodes = useProjectStore((s) => s.project.nodes);
  const edges = useProjectStore((s) => s.project.edges);
  const schedule = useProjectStore((s) => s.project.schedule);

  const [activeTab, setActiveTab] = useState<ScheduleTab>("nodes");

  // Filter to non-output nodes (output nodes are not measured)
  const schedulableNodeIds = useMemo(
    () => nodes.filter((n) => n.role !== "output").map((n) => n.id),
    [nodes]
  );

  // Get input node IDs for autoFillEdges logic
  const inputNodeIds = useMemo(
    () => nodes.filter((n) => n.role === "input").map((n) => n.id),
    [nodes]
  );

  // Initialize draft when editor opens (if not already initialized)
  useEffect(() => {
    if (isEditorOpen && !draftSchedule) {
      initializeDraft(schedulableNodeIds, edges, schedule, inputNodeIds);
    }
  }, [
    isEditorOpen,
    draftSchedule,
    schedulableNodeIds,
    edges,
    schedule,
    inputNodeIds,
    initializeDraft,
  ]);

  // Reset draft when nodes or edges change significantly
  useEffect(() => {
    if (draftSchedule) {
      const draftNodeIds = new Set(Object.keys(draftSchedule.entries));
      const currentNodeIds = new Set(schedulableNodeIds);
      const draftEdgeIds = new Set(Object.keys(draftSchedule.edgeEntries));
      const currentEdgeIds = new Set(edges.map((e) => e.id));

      // Check if nodes have changed
      const hasNewNodes = schedulableNodeIds.some((id) => !draftNodeIds.has(id));
      const hasRemovedNodes = Array.from(draftNodeIds).some((id) => !currentNodeIds.has(id));

      // Check if edges have changed
      const hasNewEdges = edges.some((e) => !draftEdgeIds.has(e.id));
      const hasRemovedEdges = Array.from(draftEdgeIds).some((id) => !currentEdgeIds.has(id));

      if (hasNewNodes || hasRemovedNodes || hasNewEdges || hasRemovedEdges) {
        // Reinitialize with current nodes and edges
        initializeDraft(schedulableNodeIds, edges, schedule, inputNodeIds);
      }
    }
  }, [schedulableNodeIds, edges, draftSchedule, schedule, inputNodeIds, initializeDraft]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const showWarningBanner = viewMode !== "2d-projection" && isEditorOpen;
  const hasSchedulableNodes = schedulableNodeIds.length > 0;
  const nodeCount = draftSchedule ? Object.keys(draftSchedule.entries).length : 0;
  const edgeCount = draftSchedule ? Object.keys(draftSchedule.edgeEntries).length : 0;

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
              ({nodeCount} nodes, {edgeCount} edges)
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
          ) : !hasSchedulableNodes && edges.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              No schedulable items. Add nodes and edges to edit the schedule.
            </div>
          ) : (
            <>
              <ScheduleToolbar activeTab={activeTab} />

              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("nodes")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "nodes"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Nodes ({nodeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("edges")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "edges"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Edges ({edgeCount})
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "nodes" ? <ScheduleTable /> : <EdgeScheduleTable />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
