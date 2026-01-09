/**
 * Node Creation Toolbar
 *
 * Provides controls for creating new nodes with manual coordinate input:
 * - Toggle button to show/hide coordinate input fields
 * - X, Y, Z coordinate inputs
 * - Create button to add the node
 */

"use client";

import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import type { IntermediateNode } from "@/types";
import { useCallback, useState } from "react";

// Generate unique node ID
function generateNodeId(existingIds: string[]): string {
  let counter = 0;
  let id = `n${counter}`;
  while (existingIds.includes(id)) {
    counter++;
    id = `n${counter}`;
  }
  return id;
}

export function NodeCreationToolbar(): React.ReactNode {
  const project = useProjectStore((state) => state.project);
  const addNode = useProjectStore((state) => state.addNode);
  const selectNode = useSelectionStore((state) => state.selectNode);

  const [isOpen, setIsOpen] = useState(false);
  const [x, setX] = useState("0");
  const [y, setY] = useState("0");
  const [z, setZ] = useState("0");

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleCreate = useCallback(() => {
    const xNum = Number.parseFloat(x);
    const yNum = Number.parseFloat(y);
    const zNum = Number.parseFloat(z);

    if (Number.isNaN(xNum) || Number.isNaN(yNum) || Number.isNaN(zNum)) {
      return;
    }

    const existingIds = project.nodes.map((n) => n.id);
    const newId = generateNodeId(existingIds);

    const newNode: IntermediateNode = {
      id: newId,
      coordinate: { x: xNum, y: yNum, z: zNum },
      role: "intermediate",
      measBasis: {
        type: "planner",
        plane: "XY",
        angleCoeff: 0,
      },
    };

    addNode(newNode);
    selectNode(newId);

    // Reset inputs and close
    setX("0");
    setY("0");
    setZ("0");
    setIsOpen(false);
  }, [x, y, z, project.nodes, addNode, selectNode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleCreate();
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [handleCreate]
  );

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          isOpen
            ? "bg-green-500 text-white hover:bg-green-600"
            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
        }`}
      >
        {isOpen ? "Cancel" : "Add Node"}
      </button>

      {isOpen && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <label htmlFor="node-x" className="text-xs text-gray-500">
              X
            </label>
            <input
              id="node-x"
              type="number"
              step="0.1"
              value={x}
              onChange={(e) => setX(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="flex items-center gap-1">
            <label htmlFor="node-y" className="text-xs text-gray-500">
              Y
            </label>
            <input
              id="node-y"
              type="number"
              step="0.1"
              value={y}
              onChange={(e) => setY(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="flex items-center gap-1">
            <label htmlFor="node-z" className="text-xs text-gray-500">
              Z
            </label>
            <input
              id="node-z"
              type="number"
              step="0.1"
              value={z}
              onChange={(e) => setZ(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
          >
            Create
          </button>
        </div>
      )}
    </div>
  );
}
