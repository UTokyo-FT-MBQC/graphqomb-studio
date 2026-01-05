/**
 * Z-Slice Slider
 *
 * Controls for navigating Z levels in 3D projects.
 * - Slider for continuous Z selection
 * - Prev/Next buttons for step navigation
 * - Current Z value display
 */

"use client";

import { useUIStore } from "@/stores/uiStore";

interface ZSliceSliderProps {
  minZ: number;
  maxZ: number;
}

export function ZSliceSlider({ minZ, maxZ }: ZSliceSliderProps): React.ReactNode {
  const currentZSlice = useUIStore((state) => state.currentZSlice);
  const setZSlice = useUIStore((state) => state.setZSlice);
  const incrementZSlice = useUIStore((state) => state.incrementZSlice);
  const decrementZSlice = useUIStore((state) => state.decrementZSlice);

  const isDisabled = minZ === maxZ;
  const canDecrement = currentZSlice > minZ;
  const canIncrement = currentZSlice < maxZ;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setZSlice(Number(e.target.value));
  };

  const handleDecrement = (): void => {
    if (canDecrement) {
      decrementZSlice();
    }
  };

  const handleIncrement = (): void => {
    if (canIncrement) {
      incrementZSlice();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Z-Slice:</span>

      {/* Prev Button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={isDisabled || !canDecrement}
        className={`w-6 h-6 flex items-center justify-center rounded text-sm font-medium transition-colors ${
          isDisabled || !canDecrement
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
        }`}
        title="Previous Z level"
      >
        &lt;
      </button>

      {/* Slider */}
      <input
        type="range"
        min={minZ}
        max={maxZ}
        step={1}
        value={currentZSlice}
        onChange={handleSliderChange}
        disabled={isDisabled}
        className={`w-20 h-1.5 rounded-lg appearance-none ${
          isDisabled ? "bg-gray-200 cursor-not-allowed" : "bg-gray-300 cursor-pointer"
        }`}
        title={`Z = ${currentZSlice}`}
      />

      {/* Next Button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={isDisabled || !canIncrement}
        className={`w-6 h-6 flex items-center justify-center rounded text-sm font-medium transition-colors ${
          isDisabled || !canIncrement
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
        }`}
        title="Next Z level"
      >
        &gt;
      </button>

      {/* Current Value */}
      <span className="text-sm font-medium text-gray-700 min-w-[2rem] text-center">
        {currentZSlice}
      </span>
    </div>
  );
}
