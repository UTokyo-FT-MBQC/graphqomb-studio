/**
 * FTQC Visualization Hook
 *
 * Computes which nodes should be highlighted based on UI state and FTQC data.
 * Returns a Map<nodeId, FTQCHighlight> for efficient lookup in canvas components.
 */

import { type FTQCHighlight, getObservableColor, getParityGroupColor } from "@/lib/ftqcColors";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { useMemo } from "react";

export interface FTQCVisualizationResult {
  highlights: Map<string, FTQCHighlight>;
  hasData: boolean;
  parityGroupCount: number;
  observableKeys: string[];
}

export function useFTQCVisualization(): FTQCVisualizationResult {
  const ftqc = useProjectStore((state) => state.project.ftqc);
  const ftqcVisualization = useUIStore((state) => state.ftqcVisualization);

  return useMemo(() => {
    const highlights = new Map<string, FTQCHighlight>();

    if (ftqc === undefined) {
      return {
        highlights,
        hasData: false,
        parityGroupCount: 0,
        observableKeys: [],
      };
    }

    const parityGroupCount = ftqc.parityCheckGroup.length;
    const observableKeys = Object.keys(ftqc.logicalObservableGroup).sort();
    const {
      showParityGroups,
      selectedParityGroupIndex,
      showLogicalObservables,
      selectedObservableKey,
    } = ftqcVisualization;

    // Process parity groups
    if (showParityGroups) {
      ftqc.parityCheckGroup.forEach((group, index) => {
        // Skip if a specific group is selected and this isn't it
        if (selectedParityGroupIndex !== null && selectedParityGroupIndex !== index) {
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

        const targets = ftqc.logicalObservableGroup[key];
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
      highlights,
      hasData: true,
      parityGroupCount,
      observableKeys,
    };
  }, [ftqc, ftqcVisualization]);
}
