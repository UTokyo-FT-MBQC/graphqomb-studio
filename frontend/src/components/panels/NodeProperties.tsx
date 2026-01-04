/**
 * Node Properties Panel
 *
 * Displays and allows editing of node properties:
 * - ID (readonly)
 * - Position (x, y, z for 3D)
 * - Role (input, output, intermediate)
 * - Qubit index (for input/output nodes)
 * - Measurement basis (for input/intermediate nodes) - Phase 2
 */

"use client";

import { useProjectStore } from "@/stores/projectStore";
import type { GraphNode, InputNode, IntermediateNode, NodeRole, OutputNode } from "@/types";
import { is3D } from "@/types";
import type { ChangeEvent } from "react";
import { useCallback, useMemo } from "react";

interface NodePropertiesProps {
  node: GraphNode;
}

export function NodeProperties({ node }: NodePropertiesProps): React.ReactNode {
  const project = useProjectStore((state) => state.project);
  const updateNode = useProjectStore((state) => state.updateNode);
  const removeNode = useProjectStore((state) => state.removeNode);

  const is3DMode = project.dimension === 3;

  // Handle position changes
  const handlePositionChange = useCallback(
    (axis: "x" | "y" | "z", value: string) => {
      const numValue = parseFloat(value);
      if (Number.isNaN(numValue)) return;

      const currentCoord = node.coordinate;
      let newCoord;

      if (axis === "z") {
        if (is3D(currentCoord)) {
          newCoord = { ...currentCoord, z: numValue };
        } else {
          newCoord = { ...currentCoord, z: numValue };
        }
      } else {
        newCoord = { ...currentCoord, [axis]: numValue };
      }

      updateNode(node.id, { coordinate: newCoord });
    },
    [node.id, node.coordinate, updateNode]
  );

  // Handle role change
  const handleRoleChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const newRole = e.target.value as NodeRole;

      // Create appropriate node structure based on role
      if (newRole === "input") {
        const updates: Partial<InputNode> = {
          role: "input",
          qubitIndex: 0,
          measBasis: node.role !== "output" && "measBasis" in node && node.measBasis !== undefined
            ? node.measBasis
            : { type: "planner", plane: "XY", angleCoeff: 0 },
        };
        updateNode(node.id, updates);
      } else if (newRole === "output") {
        const updates: Partial<OutputNode> = {
          role: "output",
          qubitIndex: 0,
          measBasis: undefined,
        };
        updateNode(node.id, updates);
      } else {
        const updates: Partial<IntermediateNode> = {
          role: "intermediate",
          qubitIndex: undefined,
          measBasis: node.role !== "output" && "measBasis" in node && node.measBasis !== undefined
            ? node.measBasis
            : { type: "planner", plane: "XY", angleCoeff: 0 },
        };
        updateNode(node.id, updates);
      }
    },
    [node.id, node.role, node, updateNode]
  );

  // Handle qubit index change
  const handleQubitIndexChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!Number.isNaN(value) && value >= 0) {
        updateNode(node.id, { qubitIndex: value });
      }
    },
    [node.id, updateNode]
  );

  // Handle delete
  const handleDelete = useCallback(() => {
    removeNode(node.id);
  }, [node.id, removeNode]);

  // Get current position values
  const position = useMemo(() => {
    const coord = node.coordinate;
    return {
      x: coord.x,
      y: coord.y,
      z: is3D(coord) ? coord.z : 0,
    };
  }, [node.coordinate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Node: {node.id}</h3>
        <button
          onClick={handleDelete}
          className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
        >
          Delete
        </button>
      </div>

      <div className="border-t pt-4 space-y-3">
        {/* Position */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500">X</label>
              <input
                type="number"
                step="0.1"
                value={position.x}
                onChange={(e) => handlePositionChange("x", e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Y</label>
              <input
                type="number"
                step="0.1"
                value={position.y}
                onChange={(e) => handlePositionChange("y", e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            {is3DMode && (
              <div>
                <label className="block text-xs text-gray-500">Z</label>
                <input
                  type="number"
                  step="0.1"
                  value={position.z}
                  onChange={(e) => handlePositionChange("z", e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={node.role}
            onChange={handleRoleChange}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="input">Input</option>
            <option value="output">Output</option>
            <option value="intermediate">Intermediate</option>
          </select>
        </div>

        {/* Qubit Index (for input/output) */}
        {(node.role === "input" || node.role === "output") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qubit Index</label>
            <input
              type="number"
              min="0"
              step="1"
              value={node.qubitIndex}
              onChange={handleQubitIndexChange}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        )}

        {/* Measurement Basis (for input/intermediate) - Placeholder for Phase 2 */}
        {node.role !== "output" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Basis</label>
            <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
              {node.measBasis?.type === "planner"
                ? `Planner: ${node.measBasis.plane}, angle = 2π × ${node.measBasis.angleCoeff}`
                : node.measBasis?.type === "axis"
                  ? `Axis: ${node.measBasis.axis} (${node.measBasis.sign})`
                  : "Not set"}
              <p className="text-xs text-gray-400 mt-1">(Editing in Phase 2)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
