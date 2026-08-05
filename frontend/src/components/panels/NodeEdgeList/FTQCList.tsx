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
import { isFlagDetector } from "@/lib/detectorTags";
import { getObservableColor, getParityGroupColor } from "@/lib/ftqcColors";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import type { DetectorMismatch } from "@/types";

function formatMeasurementAngle(angleCoeff: number | null): string {
  if (angleCoeff === null) return "unassigned";

  const piMultiple = angleCoeff * 2;
  for (const denominator of [1, 2, 4, 8, 16]) {
    const numerator = Math.round(piMultiple * denominator);
    if (Math.abs(piMultiple - numerator / denominator) < 1e-9) {
      if (numerator === 0) return "0";
      const sign = numerator < 0 ? "-" : "";
      const absoluteNumerator = Math.abs(numerator);
      const numeratorLabel = absoluteNumerator === 1 ? "" : String(absoluteNumerator);
      return denominator === 1
        ? `${sign}${numeratorLabel}π`
        : `${sign}${numeratorLabel}π/${denominator}`;
    }
  }
  return `${Number(piMultiple.toFixed(6))}π`;
}

function mismatchDescription(mismatch: DetectorMismatch): string {
  if (mismatch.reason === "non-pauli-measurement") {
    const nodeMeasurement =
      mismatch.measurementPlane === null
        ? "unassigned"
        : `${mismatch.measurementPlane}, angle ${formatMeasurementAngle(mismatch.measurementAngleCoeff)}`;
    return mismatch.stabilizerAxis === null
      ? `${mismatch.nodeId}: detector includes a non-Pauli measurement (${nodeMeasurement}), but stabilizer has no support`
      : `${mismatch.nodeId}: required support ${mismatch.stabilizerAxis}, but node measurement is non-Pauli (${nodeMeasurement})`;
  }

  if (mismatch.reason === "missing-measurement-support") {
    const nodeMeasurement =
      mismatch.configuredMeasurementAxis ??
      (mismatch.measurementPlane === null
        ? "unassigned"
        : `${mismatch.measurementPlane}, angle ${formatMeasurementAngle(mismatch.measurementAngleCoeff)}`);
    return `${mismatch.nodeId}: required support ${mismatch.stabilizerAxis}, but node is not included in detector (node measurement: ${nodeMeasurement})`;
  }

  if (mismatch.reason === "missing-stabilizer-support") {
    return `${mismatch.nodeId}: detector measures ${mismatch.detectorMeasurementAxis}, but stabilizer has no support`;
  }

  return `${mismatch.nodeId}: required support ${mismatch.stabilizerAxis} ≠ measurement ${mismatch.detectorMeasurementAxis}`;
}

export function FTQCList(): React.ReactNode {
  const originalFTQC = useProjectStore((state) => state.project.ftqc);
  const {
    displayedFTQC,
    parityGroupCount,
    observableKeys,
    isCompiling,
    compilationError,
    detectorDiagnostics,
  } = useFTQCVisualization();

  const ftqcVisualization = useUIStore((state) => state.ftqcVisualization);
  const setFTQCDisplayMode = useUIStore((state) => state.setFTQCDisplayMode);
  const toggleShowParityGroups = useUIStore((state) => state.toggleShowParityGroups);
  const setDetectorTypeFilter = useUIStore((state) => state.setDetectorTypeFilter);
  const setSelectedParityGroupIndex = useUIStore((state) => state.setSelectedParityGroupIndex);
  const toggleShowLogicalObservables = useUIStore((state) => state.toggleShowLogicalObservables);
  const setSelectedObservableKey = useUIStore((state) => state.setSelectedObservableKey);

  if (originalFTQC === undefined) {
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
  const parityGroupOptions =
    displayedFTQC?.parityCheckGroup.map((group, index) => {
      const detectorTag = displayedFTQC.parityCheckTags?.[index];
      return {
        group,
        index,
        detectorTag,
        isFlag: isFlagDetector(detectorTag),
        diagnostic: detectorDiagnostics[index],
      };
    }) ?? [];
  const flagGroupCount = parityGroupOptions.filter((option) => option.isFlag).length;
  const nonFlagGroupCount = parityGroupOptions.length - flagGroupCount;
  const nonDeterministicCount = detectorDiagnostics.filter(
    (diagnostic) => !diagnostic.deterministic
  ).length;
  const filteredParityGroupOptions = parityGroupOptions.filter((option) =>
    ftqcVisualization.detectorTypeFilter === "flag" ? option.isFlag : !option.isFlag
  );

  const selectDetectorType = (filter: "flag" | "non-flag"): void => {
    setDetectorTypeFilter(filter);
    const firstMatchingIndex = parityGroupOptions.find((option) =>
      filter === "flag" ? option.isFlag : !option.isFlag
    )?.index;
    setSelectedParityGroupIndex(firstMatchingIndex ?? null);
  };

  return (
    <div className="space-y-4 pr-1">
      <fieldset className="flex rounded bg-gray-100 p-0.5">
        <legend className="sr-only">FTQC data display</legend>
        {(["original", "compiled"] as const).map((mode) => (
          <button
            type="button"
            key={mode}
            aria-pressed={ftqcVisualization.displayMode === mode}
            onClick={() => setFTQCDisplayMode(mode)}
            className={`flex-1 rounded px-2 py-1 text-xs font-medium capitalize transition-colors ${
              ftqcVisualization.displayMode === mode
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {mode}
          </button>
        ))}
      </fieldset>

      {isCompiling && (
        <div className="py-2 text-center text-xs text-gray-500">Checking detector determinism…</div>
      )}

      {compilationError !== null && (
        <div className="rounded bg-red-50 p-2 text-xs text-red-700">{compilationError}</div>
      )}

      {!isCompiling &&
        compilationError === null &&
        displayedFTQC !== undefined &&
        !hasParityGroups &&
        !hasObservables && (
          <div className="text-sm text-gray-500 text-center py-4">
            No groups defined.
            <br />
            <span className="text-xs">Use the FTQC button to add groups.</span>
          </div>
        )}

      {/* Parity Check Groups Section */}
      {displayedFTQC !== undefined && hasParityGroups && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ftqcVisualization.showParityGroups}
                onChange={toggleShowParityGroups}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-sm font-medium text-gray-700">Parity Groups</span>
              {!isCompiling && nonDeterministicCount > 0 && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                  {nonDeterministicCount} non-deterministic
                </span>
              )}
            </label>
          </div>
          <fieldset className="mb-2 flex rounded bg-gray-100 p-0.5">
            <legend className="sr-only">Detector type filter</legend>
            {(
              [
                ["non-flag", `Detectors (${nonFlagGroupCount})`],
                ["flag", `Flags (${flagGroupCount})`],
              ] as const
            ).map(([filter, label]) => (
              <button
                type="button"
                key={filter}
                aria-pressed={ftqcVisualization.detectorTypeFilter === filter}
                onClick={() => selectDetectorType(filter)}
                disabled={!ftqcVisualization.showParityGroups}
                className={`flex-1 rounded px-1 py-1 text-xs font-medium transition-colors ${
                  ftqcVisualization.detectorTypeFilter === filter
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {label}
              </button>
            ))}
          </fieldset>
          <div className="space-y-1">
            {filteredParityGroupOptions.length === 0 && (
              <div className="rounded bg-gray-50 p-3 text-sm text-gray-400">
                {ftqcVisualization.detectorTypeFilter === "flag"
                  ? "No flag groups."
                  : "No detectors."}
              </div>
            )}
            {filteredParityGroupOptions.map(({ group, index, detectorTag, isFlag, diagnostic }) => {
              const color = getParityGroupColor(index);
              const isSelected = ftqcVisualization.selectedParityGroupIndex === index;
              const isVisible = ftqcVisualization.showParityGroups && isSelected;

              return (
                <button
                  type="button"
                  key={`parity-${index}`}
                  onClick={() => {
                    if (ftqcVisualization.showParityGroups) {
                      setSelectedParityGroupIndex(index);
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
                    {isFlag && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                        Flag
                      </span>
                    )}
                    {detectorTag !== undefined && detectorTag !== "" && !isFlag && (
                      <span
                        className="min-w-0 truncate text-[10px] text-gray-400"
                        title={detectorTag}
                      >
                        {detectorTag}
                      </span>
                    )}
                    {diagnostic !== undefined && (
                      <span
                        className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          diagnostic.deterministic
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {diagnostic.deterministic ? "Deterministic" : "Non-deterministic"}
                      </span>
                    )}
                  </div>
                  <div
                    className="ml-5 mt-0.5 text-xs text-gray-500 truncate"
                    title={group.join(", ")}
                  >
                    {group.length > 0 ? group.join(", ") : "(empty)"}
                  </div>
                  {diagnostic !== undefined && !diagnostic.deterministic && (
                    <div className="ml-5 mt-1 space-y-1 rounded bg-red-50 px-2 py-1.5 text-[11px] leading-relaxed text-red-700">
                      <div className="font-medium">Support / measurement mismatch</div>
                      {diagnostic.mismatches.map((mismatch) => (
                        <div key={mismatch.nodeId} className="break-words">
                          {mismatchDescription(mismatch)}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      {hasParityGroups && hasObservables && <div className="border-t border-gray-200" />}

      {/* Logical Observables Section */}
      {displayedFTQC !== undefined && hasObservables && (
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
          <div className="space-y-1">
            {observableKeys.map((key, keyIndex) => {
              const targets = displayedFTQC.logicalObservableGroup[key] ?? [];
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
