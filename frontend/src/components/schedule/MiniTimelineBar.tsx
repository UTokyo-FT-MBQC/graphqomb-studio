/**
 * Mini Timeline Bar
 *
 * Visual representation of prepare and measure times in a compact bar format.
 * Shows the lifetime of a node from prepare to measure.
 */

"use client";

import { memo, useMemo } from "react";

interface MiniTimelineBarProps {
  prepareTime: number | null;
  measureTime: number | null;
  maxTime: number;
  locked?: boolean;
}

function MiniTimelineBarComponent({
  prepareTime,
  measureTime,
  maxTime,
  locked = false,
}: MiniTimelineBarProps): React.ReactNode {
  const { barStyle, hasData, isValid } = useMemo(() => {
    const prep = prepareTime ?? 0;
    const meas = measureTime ?? maxTime;
    const hasData = prepareTime !== null || measureTime !== null;
    const isValid = prepareTime !== null && measureTime !== null && prepareTime < measureTime;

    if (!hasData) {
      return { barStyle: {}, hasData: false, isValid: false };
    }

    // Calculate positions as percentages
    const startPercent = (prep / (maxTime + 1)) * 100;
    const endPercent = ((meas + 1) / (maxTime + 1)) * 100;
    const width = Math.max(endPercent - startPercent, 5); // Minimum 5% width

    return {
      barStyle: {
        left: `${startPercent}%`,
        width: `${width}%`,
      },
      hasData,
      isValid,
    };
  }, [prepareTime, measureTime, maxTime]);

  // Determine bar color based on state
  const getBarColor = () => {
    if (!hasData) return "bg-gray-200";
    if (locked) return "bg-yellow-400";
    if (!isValid) return "bg-red-400";
    return "bg-blue-400";
  };

  // Determine border style
  const getBorderStyle = () => {
    if (!hasData) return "border-dashed border-gray-300";
    if (locked) return "border-solid border-yellow-500";
    return "border-solid border-blue-500";
  };

  return (
    <div className="relative h-4 w-full min-w-[100px] bg-gray-100 rounded overflow-hidden">
      {/* Time grid markers - static dividers, order never changes */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: maxTime + 1 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static grid dividers that never reorder
          <div key={i} className="flex-1 border-r border-gray-200 last:border-r-0" />
        ))}
      </div>

      {/* Node lifetime bar */}
      {hasData ? (
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-sm border ${getBarColor()} ${getBorderStyle()} transition-all duration-150`}
          style={barStyle}
        >
          {/* Prepare marker */}
          {prepareTime !== null && (
            <div
              className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600 rounded-l-sm"
              title={`Prepare: ${prepareTime}`}
            />
          )}

          {/* Measure marker */}
          {measureTime !== null && (
            <div
              className="absolute right-0 top-0 bottom-0 w-1 bg-green-600 rounded-r-sm"
              title={`Measure: ${measureTime}`}
            />
          )}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-gray-400">Not scheduled</span>
        </div>
      )}
    </div>
  );
}

export const MiniTimelineBar = memo(MiniTimelineBarComponent);
