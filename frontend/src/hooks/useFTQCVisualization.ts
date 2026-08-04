/**
 * FTQC Visualization Hook
 *
 * Computes which nodes should be highlighted based on UI state and FTQC data.
 * Returns a Map<nodeId, FTQCHighlight> for efficient lookup in canvas components.
 *
 * IMPORTANT: This hook should only be called once at the canvas level, not per-node.
 * Use FTQCHighlightContext to pass highlights to individual node components.
 */

import { useEffect, useMemo } from "react";
import { isFlagDetector } from "@/lib/detectorTags";
import { type FTQCHighlight, getObservableColor, getParityGroupColor } from "@/lib/ftqcColors";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import type { FTQCDefinition } from "@/types";
import { useCompiledFTQC } from "./useCompiledFTQC";

export interface FTQCVisualizationResult {
  displayedFTQC: FTQCDefinition | undefined;
  highlights: Map<string, FTQCHighlight>;
  hasData: boolean;
  parityGroupCount: number;
  observableKeys: string[];
  isCompiling: boolean;
  compilationError: string | null;
}

export function useFTQCVisualization(): FTQCVisualizationResult {
  const ftqc = useProjectStore((state) => state.project.ftqc);
  const ftqcVisualization = useUIStore((state) => state.ftqcVisualization);
  const isCompiledMode = ftqcVisualization.displayMode === "compiled";
  const { compiledFTQC, isLoading, error } = useCompiledFTQC(isCompiledMode);
  const displayedFTQC = isCompiledMode ? (compiledFTQC ?? undefined) : ftqc;
  const isCompiling = isCompiledMode && isLoading;
  const compilationError = isCompiledMode ? error : null;
  const setSelectedParityGroupIndex = useUIStore((state) => state.setSelectedParityGroupIndex);
  const setSelectedObservableKey = useUIStore((state) => state.setSelectedObservableKey);

  const selectedParityGroupIndex = ftqcVisualization.selectedParityGroupIndex;
  const selectedObservableKey = ftqcVisualization.selectedObservableKey;
  const detectorTypeFilter = ftqcVisualization.detectorTypeFilter;
  const showParityGroups = ftqcVisualization.showParityGroups;

  // Validate and reset selection when underlying data changes
  // This prevents stale selection indices after group deletion/reordering
  useEffect(() => {
    if (isCompiledMode && displayedFTQC === undefined) return;

    const observableKeys = Object.keys(displayedFTQC?.logicalObservableGroup ?? {});
    const matchingParityGroupIndices =
      displayedFTQC?.parityCheckGroup.flatMap((_group, index) => {
        const isFlag = isFlagDetector(displayedFTQC.parityCheckTags?.[index]);
        const matches = detectorTypeFilter === "flag" ? isFlag : !isFlag;
        return matches ? [index] : [];
      }) ?? [];

    // Select the first group in the active category when the current selection
    // is absent, stale, or belongs to the other detector category.
    if (
      showParityGroups &&
      (selectedParityGroupIndex === null ||
        !matchingParityGroupIndices.includes(selectedParityGroupIndex))
    ) {
      setSelectedParityGroupIndex(matchingParityGroupIndices[0] ?? null);
    }

    // Reset observable selection if key no longer exists
    if (selectedObservableKey !== null && !observableKeys.includes(selectedObservableKey)) {
      setSelectedObservableKey(null);
    }
  }, [
    displayedFTQC,
    detectorTypeFilter,
    isCompiledMode,
    selectedParityGroupIndex,
    selectedObservableKey,
    setSelectedParityGroupIndex,
    setSelectedObservableKey,
    showParityGroups,
  ]);

  return useMemo(() => {
    const highlights = new Map<string, FTQCHighlight>();

    if (displayedFTQC === undefined) {
      return {
        displayedFTQC,
        highlights,
        hasData: false,
        parityGroupCount: 0,
        observableKeys: [],
        isCompiling,
        compilationError,
      };
    }

    const parityGroupCount = displayedFTQC.parityCheckGroup.length;
    const observableKeys = Object.keys(displayedFTQC.logicalObservableGroup).sort();
    const {
      showParityGroups,
      detectorTypeFilter,
      selectedParityGroupIndex,
      showLogicalObservables,
      selectedObservableKey,
    } = ftqcVisualization;

    // Process parity groups
    if (showParityGroups) {
      displayedFTQC.parityCheckGroup.forEach((group, index) => {
        const isFlag = isFlagDetector(displayedFTQC.parityCheckTags?.[index]);
        if (
          (detectorTypeFilter === "flag" && !isFlag) ||
          (detectorTypeFilter === "non-flag" && isFlag)
        ) {
          return;
        }

        // Category tabs expose individual choices; only the chosen group is highlighted.
        if (selectedParityGroupIndex === null || selectedParityGroupIndex !== index) {
          return;
        }

        const color = getParityGroupColor(index);
        for (const nodeId of group) {
          // Don't overwrite if already highlighted (first highlight wins)
          if (!highlights.has(nodeId)) {
            highlights.set(nodeId, {
              type: "parity",
              colorHex: color.hex,
              colorRgb: color.rgb,
              groupIndex: index,
            });
          }
        }
      });
    }

    // Process logical observables (can overlap with parity groups)
    // Observable highlights take precedence over parity group highlights
    if (showLogicalObservables) {
      observableKeys.forEach((key, keyIndex) => {
        // Skip if a specific observable is selected and this isn't it
        if (selectedObservableKey !== null && selectedObservableKey !== key) {
          return;
        }

        const targets = displayedFTQC.logicalObservableGroup[key];
        if (targets === undefined) return;
        const color = getObservableColor(keyIndex);
        for (const nodeId of targets) {
          // Observable highlights take precedence
          highlights.set(nodeId, {
            type: "observable",
            colorHex: color.hex,
            colorRgb: color.rgb,
            groupIndex: keyIndex,
            groupKey: key,
          });
        }
      });
    }

    return {
      displayedFTQC,
      highlights,
      hasData: true,
      parityGroupCount,
      observableKeys,
      isCompiling,
      compilationError,
    };
  }, [compilationError, displayedFTQC, ftqcVisualization, isCompiling]);
}
