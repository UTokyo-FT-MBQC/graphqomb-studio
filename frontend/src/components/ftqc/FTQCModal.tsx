/**
 * FTQC Modal
 *
 * Modal dialog for editing FTQC (Fault-Tolerant Quantum Computing) configuration:
 * - Parity Check Groups: Groups of nodes for error detection
 * - Logical Observable Groups: Observable definitions for fault-tolerant protocols
 */

"use client";

import { useFTQCOperations } from "@/hooks/useFTQCOperations";
import { useUIStore } from "@/stores/uiStore";
import type { ChangeEvent } from "react";
import { useCallback, useId, useState } from "react";

interface NodeChipProps {
  nodeId: string;
  onRemove: (id: string) => void;
}

function NodeChip({ nodeId, onRemove }: NodeChipProps): React.ReactNode {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
      {nodeId}
      <button
        type="button"
        onClick={() => onRemove(nodeId)}
        className="text-blue-400 hover:text-blue-600"
        aria-label={`Remove ${nodeId}`}
      >
        ×
      </button>
    </span>
  );
}

interface NodeSelectorProps {
  availableNodes: string[];
  onAdd: (nodeId: string) => void;
  placeholder: string;
}

function NodeSelector({ availableNodes, onAdd, placeholder }: NodeSelectorProps): React.ReactNode {
  const id = useId();
  const [selectedNode, setSelectedNode] = useState("");

  const handleChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedNode(e.target.value);
  }, []);

  const handleAdd = useCallback(() => {
    if (selectedNode !== "") {
      onAdd(selectedNode);
      setSelectedNode("");
    }
  }, [selectedNode, onAdd]);

  if (availableNodes.length === 0) {
    return <span className="text-xs text-gray-400">No available nodes</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <select
        id={id}
        value={selectedNode}
        onChange={handleChange}
        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
      >
        <option value="">{placeholder}</option>
        {availableNodes.map((node) => (
          <option key={node} value={node}>
            {node}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleAdd}
        disabled={selectedNode === ""}
        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}

interface ParityCheckGroupRowProps {
  index: number;
  nodes: string[];
  availableNodes: string[];
  onAddNode: (index: number, nodeId: string) => void;
  onRemoveNode: (index: number, nodeId: string) => void;
  onDelete: (index: number) => void;
}

function ParityCheckGroupRow({
  index,
  nodes,
  availableNodes,
  onAddNode,
  onRemoveNode,
  onDelete,
}: ParityCheckGroupRowProps): React.ReactNode {
  return (
    <div className="border border-gray-200 rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">Group {index}</span>
        <button
          type="button"
          onClick={() => onDelete(index)}
          className="text-red-500 hover:text-red-700 text-sm"
          aria-label={`Delete group ${index}`}
        >
          Delete
        </button>
      </div>

      {/* Node chips */}
      <div className="flex flex-wrap gap-1 min-h-[24px]">
        {nodes.length > 0 ? (
          nodes.map((nodeId) => (
            <NodeChip key={nodeId} nodeId={nodeId} onRemove={(id) => onRemoveNode(index, id)} />
          ))
        ) : (
          <span className="text-xs text-gray-400">No nodes</span>
        )}
      </div>

      {/* Add node selector */}
      <NodeSelector
        availableNodes={availableNodes}
        onAdd={(nodeId) => onAddNode(index, nodeId)}
        placeholder="Add node..."
      />
    </div>
  );
}

interface LogicalObservableRowProps {
  observableKey: string;
  nodes: string[];
  availableNodes: string[];
  onAddNode: (key: string, nodeId: string) => void;
  onRemoveNode: (key: string, nodeId: string) => void;
  onDelete: (key: string) => void;
}

function LogicalObservableRow({
  observableKey,
  nodes,
  availableNodes,
  onAddNode,
  onRemoveNode,
  onDelete,
}: LogicalObservableRowProps): React.ReactNode {
  return (
    <div className="border border-gray-200 rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">Observable {observableKey}</span>
        <button
          type="button"
          onClick={() => onDelete(observableKey)}
          className="text-red-500 hover:text-red-700 text-sm"
          aria-label={`Delete observable ${observableKey}`}
        >
          Delete
        </button>
      </div>

      {/* Node chips */}
      <div className="flex flex-wrap gap-1 min-h-[24px]">
        {nodes.length > 0 ? (
          nodes.map((nodeId) => (
            <NodeChip
              key={nodeId}
              nodeId={nodeId}
              onRemove={(id) => onRemoveNode(observableKey, id)}
            />
          ))
        ) : (
          <span className="text-xs text-gray-400">No nodes</span>
        )}
      </div>

      {/* Add node selector */}
      <NodeSelector
        availableNodes={availableNodes}
        onAdd={(nodeId) => onAddNode(observableKey, nodeId)}
        placeholder="Add node..."
      />
    </div>
  );
}

export function FTQCModal(): React.ReactNode {
  const isOpen = useUIStore((state) => state.isFTQCModalOpen);
  const closeFTQCModal = useUIStore((state) => state.closeFTQCModal);

  const {
    parityCheckGroups,
    addNewParityCheckGroup,
    deleteParityCheckGroup,
    addNodeToParityGroup,
    removeNodeFromParityGroup,
    getAvailableNodesForParityGroup,
    logicalObservableGroups,
    addNewLogicalObservable,
    deleteLogicalObservable,
    addNodeToLogicalObservable,
    removeNodeFromLogicalObservable,
    getAvailableNodesForObservable,
    availableNodes,
  } = useFTQCOperations();

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        closeFTQCModal();
      }
    },
    [closeFTQCModal]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        closeFTQCModal();
      }
    },
    [closeFTQCModal]
  );

  if (!isOpen) {
    return null;
  }

  const sortedObservableKeys = Object.keys(logicalObservableGroups).sort(
    (a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10)
  );

  return (
    // biome-ignore lint/a11y/useSemanticElements: Using div for custom modal backdrop styling
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ftqc-modal-title"
      tabIndex={-1}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="ftqc-modal-title" className="text-lg font-semibold text-gray-800">
            FTQC Configuration
          </h2>
          <button
            type="button"
            onClick={closeFTQCModal}
            className="text-gray-400 hover:text-gray-600 text-xl"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)] space-y-6">
          {availableNodes.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No measurable nodes available. Add input or intermediate nodes first.
            </div>
          ) : (
            <>
              {/* Parity Check Groups Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-medium text-gray-700">Parity Check Groups</h3>
                  <button
                    type="button"
                    onClick={addNewParityCheckGroup}
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    + Add Group
                  </button>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  Define groups of nodes for parity check (error detection in FTQC).
                </div>

                <div className="space-y-3">
                  {parityCheckGroups.length > 0 ? (
                    parityCheckGroups.map((group, index) => (
                      <ParityCheckGroupRow
                        key={`parity-group-${index}`}
                        index={index}
                        nodes={group}
                        availableNodes={getAvailableNodesForParityGroup(index)}
                        onAddNode={addNodeToParityGroup}
                        onRemoveNode={removeNodeFromParityGroup}
                        onDelete={deleteParityCheckGroup}
                      />
                    ))
                  ) : (
                    <div className="text-sm text-gray-400 bg-gray-50 p-3 rounded">
                      No parity check groups defined.
                    </div>
                  )}
                </div>
              </div>

              {/* Logical Observable Groups Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-medium text-gray-700">Logical Observables</h3>
                  <button
                    type="button"
                    onClick={addNewLogicalObservable}
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    + Add Observable
                  </button>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  Define logical observable groups for fault-tolerant measurement outcomes.
                </div>

                <div className="space-y-3">
                  {sortedObservableKeys.length > 0 ? (
                    sortedObservableKeys.map((key) => (
                      <LogicalObservableRow
                        key={key}
                        observableKey={key}
                        nodes={logicalObservableGroups[key] ?? []}
                        availableNodes={getAvailableNodesForObservable(key)}
                        onAddNode={addNodeToLogicalObservable}
                        onRemoveNode={removeNodeFromLogicalObservable}
                        onDelete={deleteLogicalObservable}
                      />
                    ))
                  ) : (
                    <div className="text-sm text-gray-400 bg-gray-50 p-3 rounded">
                      No logical observables defined.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={closeFTQCModal}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
