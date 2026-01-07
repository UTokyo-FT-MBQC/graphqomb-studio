/**
 * Edge List
 *
 * Displays a filterable and sortable list of graph edges.
 */

"use client";

import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import type { GraphEdge } from "@/types";
import { useMemo, useState } from "react";
import { ListControls, type SortOption } from "./ListControls";

type EdgeSortKey = "id" | "source" | "target";

const EDGE_SORT_OPTIONS: SortOption[] = [
  { key: "id", label: "ID" },
  { key: "source", label: "Source" },
  { key: "target", label: "Target" },
];

export function EdgeList(): React.ReactNode {
  const edges = useProjectStore((state) => state.project.edges);
  const selectedEdgeId = useSelectionStore((state) => state.selectedEdgeId);
  const selectEdge = useSelectionStore((state) => state.selectEdge);

  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<EdgeSortKey>("id");
  const [sortAsc, setSortAsc] = useState(true);

  const filteredEdges = useMemo(() => {
    let result = [...edges];

    if (filter !== "") {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(
        (edge) =>
          edge.id.toLowerCase().includes(lowerFilter) ||
          edge.source.toLowerCase().includes(lowerFilter) ||
          edge.target.toLowerCase().includes(lowerFilter)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "id":
          comparison = a.id.localeCompare(b.id);
          break;
        case "source":
          comparison = a.source.localeCompare(b.source);
          break;
        case "target":
          comparison = a.target.localeCompare(b.target);
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [edges, filter, sortKey, sortAsc]);

  return (
    <div className="space-y-2">
      <ListControls
        filter={filter}
        onFilterChange={setFilter}
        filterPlaceholder="Filter by ID, source, or target..."
        sortOptions={EDGE_SORT_OPTIONS}
        sortKey={sortKey}
        onSortKeyChange={(key) => setSortKey(key as EdgeSortKey)}
        sortAsc={sortAsc}
        onSortAscChange={setSortAsc}
      />

      <div className="max-h-48 overflow-y-auto space-y-1">
        {filteredEdges.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-2">
            {edges.length === 0 ? "No edges" : "No matching edges"}
          </div>
        ) : (
          filteredEdges.map((edge) => (
            <EdgeListItem
              key={edge.id}
              edge={edge}
              isSelected={edge.id === selectedEdgeId}
              onClick={() => selectEdge(edge.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface EdgeListItemProps {
  edge: GraphEdge;
  isSelected: boolean;
  onClick: () => void;
}

function EdgeListItem({ edge, isSelected, onClick }: EdgeListItemProps): React.ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-2 py-1.5 text-left rounded flex items-center gap-1 transition-colors ${
        isSelected
          ? "bg-blue-50 border border-blue-300"
          : "hover:bg-gray-50 border border-transparent"
      }`}
    >
      <span className="font-mono text-xs text-gray-600">{edge.source}</span>
      <span className="text-gray-400">→</span>
      <span className="font-mono text-xs text-gray-600">{edge.target}</span>
    </button>
  );
}
