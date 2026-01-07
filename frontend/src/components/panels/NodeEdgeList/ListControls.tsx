/**
 * List Controls
 *
 * Reusable filter input and sort selector for lists.
 */

"use client";

export interface SortOption {
  key: string;
  label: string;
}

interface ListControlsProps {
  filter: string;
  onFilterChange: (value: string) => void;
  filterPlaceholder: string;
  sortOptions: SortOption[];
  sortKey: string;
  onSortKeyChange: (key: string) => void;
  sortAsc: boolean;
  onSortAscChange: (asc: boolean) => void;
}

export function ListControls({
  filter,
  onFilterChange,
  filterPlaceholder,
  sortOptions,
  sortKey,
  onSortKeyChange,
  sortAsc,
  onSortAscChange,
}: ListControlsProps): React.ReactNode {
  return (
    <div className="space-y-2">
      {/* Filter Input */}
      <input
        type="text"
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        placeholder={filterPlaceholder}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <select
          value={sortKey}
          onChange={(e) => onSortKeyChange(e.target.value)}
          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
        >
          {sortOptions.map((option) => (
            <option key={option.key} value={option.key}>
              Sort by {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onSortAscChange(!sortAsc)}
          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
          title={sortAsc ? "Ascending" : "Descending"}
        >
          {sortAsc ? "↑" : "↓"}
        </button>
      </div>
    </div>
  );
}
