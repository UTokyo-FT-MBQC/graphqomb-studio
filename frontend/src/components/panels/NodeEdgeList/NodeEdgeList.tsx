/**
 * Elements Panel
 *
 * Collapsible panel that displays lists of nodes, edges, and FTQC groups.
 * Supports filtering, sorting, and click-to-select functionality.
 */

"use client";

import { useProjectStore } from "@/stores/projectStore";
import { useState } from "react";
import { EdgeList } from "./EdgeList";
import { FTQCList } from "./FTQCList";
import { NodeList } from "./NodeList";

type Tab = "nodes" | "edges" | "ftqc";

interface NodeEdgeListProps {
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function NodeEdgeList({
  defaultExpanded = true,
  expanded,
  onExpandedChange,
}: NodeEdgeListProps): React.ReactNode {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<Tab>("nodes");
  const isExpanded = expanded ?? internalExpanded;

  const nodeCount = useProjectStore((state) => state.project.nodes.length);
  const edgeCount = useProjectStore((state) => state.project.edges.length);
  const ftqc = useProjectStore((state) => state.project.ftqc);
  const ftqcCount =
    (ftqc?.parityCheckGroup.length ?? 0) + Object.keys(ftqc?.logicalObservableGroup ?? {}).length;

  function setIsExpanded(nextExpanded: boolean): void {
    setInternalExpanded(nextExpanded);
    onExpandedChange?.(nextExpanded);
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-b border-gray-200">
      {/* Header with collapse toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full shrink-0 items-center justify-between bg-gray-50 px-4 py-2 transition-colors hover:bg-gray-100"
      >
        <span className="text-sm font-medium text-gray-700">Elements</span>
        <span className="text-gray-400">{isExpanded ? "▼" : "▶"}</span>
      </button>

      {isExpanded && (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {/* Tab Selector */}
          <div className="flex shrink-0 border-b border-gray-200">
            <TabButton
              active={activeTab === "nodes"}
              onClick={() => setActiveTab("nodes")}
              count={nodeCount}
            >
              Nodes
            </TabButton>
            <TabButton
              active={activeTab === "edges"}
              onClick={() => setActiveTab("edges")}
              count={edgeCount}
            >
              Edges
            </TabButton>
            <TabButton
              active={activeTab === "ftqc"}
              onClick={() => setActiveTab("ftqc")}
              count={ftqcCount}
            >
              FTQC
            </TabButton>
          </div>

          {/* Content */}
          {activeTab === "nodes" && <NodeList />}
          {activeTab === "edges" && <EdgeList />}
          {activeTab === "ftqc" && <FTQCList />}
        </div>
      )}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}

function TabButton({ active, onClick, count, children }: TabButtonProps): React.ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-500 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      {children}
      <span className="ml-1 text-xs text-gray-400">({count})</span>
    </button>
  );
}
