/**
 * Ghost Range Slider
 *
 * Controls for adjusting the Z distance threshold for ghost node visibility.
 * Ghost nodes are shown when |Z diff| <= ghostZRange.
 */

"use client";

import { useUIStore } from "@/stores/uiStore";
import { useCallback } from "react";

export function GhostRangeSlider(): React.ReactNode {
  const ghostZRange = useUIStore((state) => state.ghostZRange);
  const setGhostZRange = useUIStore((state) => state.setGhostZRange);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setGhostZRange(Number(e.target.value));
    },
    [setGhostZRange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const value = Number.parseFloat(e.target.value);
      if (!Number.isNaN(value) && value >= 0) {
        setGhostZRange(value);
      }
    },
    [setGhostZRange]
  );

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Ghost:</span>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={5}
        step={0.5}
        value={ghostZRange}
        onChange={handleSliderChange}
        className="w-16 h-1.5 rounded-lg appearance-none bg-gray-300 cursor-pointer"
        title={`Ghost range: ${ghostZRange}`}
      />

      {/* Current Value Input */}
      <input
        type="number"
        min={0}
        step={0.5}
        value={ghostZRange}
        onChange={handleInputChange}
        className="w-12 px-1 py-0.5 text-sm text-center border border-gray-300 rounded"
        title="Ghost Z range"
      />
    </div>
  );
}
