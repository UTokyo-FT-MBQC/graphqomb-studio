/**
 * View Controls
 *
 * Provides toggle controls for flow visualization.
 * - X-Flow toggle (red)
 * - Z-Flow toggle (blue)
 */

"use client";

import { useUIStore } from "@/stores/uiStore";

export function ViewControls(): React.ReactNode {
  const showXFlow = useUIStore((state) => state.showXFlow);
  const showZFlow = useUIStore((state) => state.showZFlow);
  const toggleXFlow = useUIStore((state) => state.toggleXFlow);
  const toggleZFlow = useUIStore((state) => state.toggleZFlow);

  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={showXFlow}
          onChange={toggleXFlow}
          className="w-4 h-4 accent-red-500"
        />
        <span className="text-sm text-red-600">X-Flow</span>
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={showZFlow}
          onChange={toggleZFlow}
          className="w-4 h-4 accent-blue-500"
        />
        <span className="text-sm text-blue-600">Z-Flow</span>
      </label>
    </div>
  );
}
