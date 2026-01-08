/**
 * Node/Edge List Panel
 *
 * Collapsible panel that displays a list of all nodes and edges.
 * Supports filtering, sorting, and click-to-select functionality.
 */

"use client";

import { useProjectStore } from "@/stores/projectStore";
import { useState } from "react";
import { EdgeList } from "./EdgeList";
import { NodeList } from "./NodeList";

type Tab = "nodes" | "edges";

interface NodeEdgeListProps {
  defaultExpanded?: boolean;
}

export function NodeEdgeList({ defaultExpanded = true }: NodeEdgeListProps): React.ReactNode {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<Tab>("nodes");

  const nodeCount = useProjectStore((state) => state.project.nodes.length);
  const edgeCount = useProjectStore((state) => state.project.edges.length);

  return (
    <div className="border-b border-gray-200">
      {/* Header with collapse toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">Node/Edge List</span>
        <span className="text-gray-400">{isExpanded ? "▼" : "▶"}</span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Tab Selector */}
          <div className="flex border-b border-gray-200">
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
          </div>

          {/* Content */}
          {activeTab === "nodes" ? <NodeList /> : <EdgeList />}
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
