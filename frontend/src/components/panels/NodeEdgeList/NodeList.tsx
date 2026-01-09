/**
 * Node List
 *
 * Displays a filterable and sortable list of graph nodes.
 */

"use client";

import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import type { GraphNode } from "@/types";
import { useMemo, useState } from "react";
import { ListControls, type SortOption } from "./ListControls";

type NodeSortKey = "id" | "role" | "x" | "y" | "z";

const NODE_SORT_OPTIONS: SortOption[] = [
  { key: "id", label: "ID" },
  { key: "role", label: "Role" },
  { key: "x", label: "X Position" },
  { key: "y", label: "Y Position" },
  { key: "z", label: "Z Position" },
];

export function NodeList(): React.ReactNode {
  const nodes = useProjectStore((state) => state.project.nodes);
  const selectedNodeId = useSelectionStore((state) => state.selectedNodeId);
  const selectNode = useSelectionStore((state) => state.selectNode);

  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<NodeSortKey>("id");
  const [sortAsc, setSortAsc] = useState(true);

  // Filter and sort nodes
  const filteredNodes = useMemo(() => {
    let result = [...nodes];

    // Filter by ID or role
    if (filter !== "") {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(
        (node) =>
          node.id.toLowerCase().includes(lowerFilter) ||
          node.role.toLowerCase().includes(lowerFilter)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "id":
          comparison = a.id.localeCompare(b.id);
          break;
        case "role":
          comparison = a.role.localeCompare(b.role);
          break;
        case "x":
          comparison = a.coordinate.x - b.coordinate.x;
          break;
        case "y":
          comparison = a.coordinate.y - b.coordinate.y;
          break;
        case "z":
          comparison = a.coordinate.z - b.coordinate.z;
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [nodes, filter, sortKey, sortAsc]);

  const sortOptions = NODE_SORT_OPTIONS;

  return (
    <div className="space-y-2">
      <ListControls
        filter={filter}
        onFilterChange={setFilter}
        filterPlaceholder="Filter by ID or role..."
        sortOptions={sortOptions}
        sortKey={sortKey}
        onSortKeyChange={(key) => setSortKey(key as NodeSortKey)}
        sortAsc={sortAsc}
        onSortAscChange={setSortAsc}
      />

      <div className="max-h-48 overflow-y-auto space-y-1">
        {filteredNodes.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-2">
            {nodes.length === 0 ? "No nodes" : "No matching nodes"}
          </div>
        ) : (
          filteredNodes.map((node) => (
            <NodeListItem
              key={node.id}
              node={node}
              isSelected={node.id === selectedNodeId}
              onClick={() => selectNode(node.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface NodeListItemProps {
  node: GraphNode;
  isSelected: boolean;
  onClick: () => void;
}

function NodeListItem({ node, isSelected, onClick }: NodeListItemProps): React.ReactNode {
  // Role badge color
  const roleColor: Record<string, string> = {
    input: "bg-green-100 text-green-700",
    output: "bg-blue-100 text-blue-700",
    intermediate: "bg-gray-100 text-gray-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-2 py-1.5 text-left rounded flex items-center gap-2 transition-colors ${
        isSelected
          ? "bg-blue-50 border border-blue-300"
          : "hover:bg-gray-50 border border-transparent"
      }`}
    >
      <span className="font-mono text-sm text-gray-800">{node.id}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded ${roleColor[node.role]}`}>{node.role}</span>
    </button>
  );
}
