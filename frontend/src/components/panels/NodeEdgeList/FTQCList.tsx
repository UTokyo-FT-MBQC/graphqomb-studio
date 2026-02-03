/**
 * FTQC List Component
 *
 * Displays Parity Check Groups and Logical Observables with:
 * - Node ID previews for each group
 * - Visualization toggle and selection controls
 * - Color indicators matching canvas highlights
 */

"use client";

import { useFTQCVisualization } from "@/hooks/useFTQCVisualization";
import { getObservableColor, getParityGroupColor } from "@/lib/ftqcColors";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";

export function FTQCList(): React.ReactNode {
  const ftqc = useProjectStore((state) => state.project.ftqc);
  const { parityGroupCount, observableKeys } = useFTQCVisualization();

  const ftqcVisualization = useUIStore((state) => state.ftqcVisualization);
  const toggleShowParityGroups = useUIStore((state) => state.toggleShowParityGroups);
  const setSelectedParityGroupIndex = useUIStore((state) => state.setSelectedParityGroupIndex);
  const toggleShowLogicalObservables = useUIStore((state) => state.toggleShowLogicalObservables);
  const setSelectedObservableKey = useUIStore((state) => state.setSelectedObservableKey);

  if (ftqc === undefined) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No FTQC data defined.
        <br />
        <span className="text-xs">Use the FTQC button to add groups.</span>
      </div>
    );
  }

  const hasParityGroups = parityGroupCount > 0;
  const hasObservables = observableKeys.length > 0;

  if (!hasParityGroups && !hasObservables) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No groups defined.
        <br />
        <span className="text-xs">Use the FTQC button to add groups.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Parity Check Groups Section */}
      {hasParityGroups && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ftqcVisualization.showParityGroups}
                onChange={toggleShowParityGroups}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-sm font-medium text-gray-700">Parity Groups</span>
            </label>
            {ftqcVisualization.showParityGroups &&
              ftqcVisualization.selectedParityGroupIndex !== null && (
                <button
                  type="button"
                  onClick={() => setSelectedParityGroupIndex(null)}
                  className="text-xs text-orange-600 hover:text-orange-800"
                >
                  Show All
                </button>
              )}
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {ftqc.parityCheckGroup.map((group, index) => {
              const color = getParityGroupColor(index);
              const isSelected = ftqcVisualization.selectedParityGroupIndex === index;
              const isVisible =
                ftqcVisualization.showParityGroups &&
                (ftqcVisualization.selectedParityGroupIndex === null || isSelected);

              return (
                <button
                  type="button"
                  key={`parity-${index}`}
                  onClick={() => {
                    if (ftqcVisualization.showParityGroups) {
                      setSelectedParityGroupIndex(isSelected ? null : index);
                    }
                  }}
                  disabled={!ftqcVisualization.showParityGroups}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                    isSelected
                      ? "bg-orange-100 border border-orange-300"
                      : ftqcVisualization.showParityGroups
                        ? "hover:bg-gray-100 border border-transparent"
                        : "opacity-50 cursor-not-allowed border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${isVisible ? "" : "opacity-30"}`}
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="font-medium text-gray-700">Group {index}</span>
                  </div>
                  <div
                    className="ml-5 mt-0.5 text-xs text-gray-500 truncate"
                    title={group.join(", ")}
                  >
                    {group.length > 0 ? group.join(", ") : "(empty)"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      {hasParityGroups && hasObservables && <div className="border-t border-gray-200" />}

      {/* Logical Observables Section */}
      {hasObservables && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ftqcVisualization.showLogicalObservables}
                onChange={toggleShowLogicalObservables}
                className="w-4 h-4 accent-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">Logical Observables</span>
            </label>
            {ftqcVisualization.showLogicalObservables &&
              ftqcVisualization.selectedObservableKey !== null && (
                <button
                  type="button"
                  onClick={() => setSelectedObservableKey(null)}
                  className="text-xs text-purple-600 hover:text-purple-800"
                >
                  Show All
                </button>
              )}
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {observableKeys.map((key, keyIndex) => {
              const targets = ftqc.logicalObservableGroup[key] ?? [];
              const color = getObservableColor(keyIndex);
              const isSelected = ftqcVisualization.selectedObservableKey === key;
              const isVisible =
                ftqcVisualization.showLogicalObservables &&
                (ftqcVisualization.selectedObservableKey === null || isSelected);

              return (
                <button
                  type="button"
                  key={`observable-${key}`}
                  onClick={() => {
                    if (ftqcVisualization.showLogicalObservables) {
                      setSelectedObservableKey(isSelected ? null : key);
                    }
                  }}
                  disabled={!ftqcVisualization.showLogicalObservables}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                    isSelected
                      ? "bg-purple-100 border border-purple-300"
                      : ftqcVisualization.showLogicalObservables
                        ? "hover:bg-gray-100 border border-transparent"
                        : "opacity-50 cursor-not-allowed border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${isVisible ? "" : "opacity-30"}`}
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="font-medium text-gray-700">Observable {key}</span>
                  </div>
                  <div
                    className="ml-5 mt-0.5 text-xs text-gray-500 truncate"
                    title={targets.join(", ")}
                  >
                    {targets.length > 0 ? targets.join(", ") : "(empty)"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
