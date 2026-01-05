/**
 * Flow Editor
 *
 * Allows editing of X-Flow and Z-Flow targets for a node.
 * - X-Flow: Manual selection of correction targets
 * - Z-Flow: Auto mode (odd_neighbors) or manual selection
 */

"use client";

import { useFlowOperations } from "@/hooks/useFlowOperations";
import type { ChangeEvent } from "react";
import { useCallback, useId, useState } from "react";

interface FlowEditorProps {
  nodeId: string;
}

interface TargetChipProps {
  targetId: string;
  onRemove: (id: string) => void;
}

function TargetChip({ targetId, onRemove }: TargetChipProps): React.ReactNode {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
      {targetId}
      <button
        type="button"
        onClick={() => onRemove(targetId)}
        className="text-gray-400 hover:text-gray-600"
        aria-label={`Remove ${targetId}`}
      >
        ×
      </button>
    </span>
  );
}

interface TargetSelectorProps {
  availableTargets: string[];
  onAdd: (targetId: string) => void;
  label: string;
}

function TargetSelector({ availableTargets, onAdd, label }: TargetSelectorProps): React.ReactNode {
  const id = useId();
  const [selectedTarget, setSelectedTarget] = useState("");

  const handleChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedTarget(e.target.value);
  }, []);

  const handleAdd = useCallback(() => {
    if (selectedTarget !== "") {
      onAdd(selectedTarget);
      setSelectedTarget("");
    }
  }, [selectedTarget, onAdd]);

  if (availableTargets.length === 0) {
    return <span className="text-xs text-gray-400">No available targets</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <select
        id={id}
        value={selectedTarget}
        onChange={handleChange}
        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
      >
        <option value="">{label}</option>
        {availableTargets.map((target) => (
          <option key={target} value={target}>
            {target}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleAdd}
        disabled={selectedTarget === ""}
        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}

export function FlowEditor({ nodeId }: FlowEditorProps): React.ReactNode {
  const id = useId();
  const {
    xflowTargets,
    addXFlowTarget,
    removeXFlowTarget,
    availableXFlowTargets,
    isZFlowAuto,
    zflowTargets,
    setZFlowAuto,
    setZFlowManual,
    addZFlowTarget,
    removeZFlowTarget,
    availableZFlowTargets,
  } = useFlowOperations(nodeId);

  return (
    <div className="space-y-4">
      {/* X-Flow Section */}
      <div>
        <span className="block text-sm font-medium text-gray-700 mb-2">X-Flow Targets</span>

        {/* Current targets */}
        <div className="flex flex-wrap gap-1 mb-2 min-h-[24px]">
          {xflowTargets.length > 0 ? (
            xflowTargets.map((target) => (
              <TargetChip key={target} targetId={target} onRemove={removeXFlowTarget} />
            ))
          ) : (
            <span className="text-xs text-gray-400">No targets</span>
          )}
        </div>

        {/* Add target */}
        <TargetSelector
          availableTargets={availableXFlowTargets}
          onAdd={addXFlowTarget}
          label="Add target..."
        />
      </div>

      {/* Z-Flow Section */}
      <div>
        <span className="block text-sm font-medium text-gray-700 mb-2">Z-Flow Mode</span>

        {/* Mode Toggle */}
        <div className="flex gap-4 mb-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={`${id}-zflow-mode`}
              checked={isZFlowAuto}
              onChange={() => setZFlowAuto()}
              className="w-4 h-4"
            />
            <span className="text-sm">Auto</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={`${id}-zflow-mode`}
              checked={!isZFlowAuto}
              onChange={() => setZFlowManual()}
              className="w-4 h-4"
            />
            <span className="text-sm">Manual</span>
          </label>
        </div>

        {isZFlowAuto ? (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            Z-Flow will be computed automatically using odd_neighbors calculation.
            <br />
            <span className="text-gray-400">(Resolved in Phase 3 backend integration)</span>
          </div>
        ) : (
          <>
            {/* Manual Z-Flow targets */}
            <div className="flex flex-wrap gap-1 mb-2 min-h-[24px]">
              {zflowTargets.length > 0 ? (
                zflowTargets.map((target) => (
                  <TargetChip key={target} targetId={target} onRemove={removeZFlowTarget} />
                ))
              ) : (
                <span className="text-xs text-gray-400">No targets</span>
              )}
            </div>

            {/* Add target */}
            <TargetSelector
              availableTargets={availableZFlowTargets}
              onAdd={addZFlowTarget}
              label="Add target..."
            />
          </>
        )}
      </div>
    </div>
  );
}
