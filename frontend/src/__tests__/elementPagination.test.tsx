import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EdgeList } from "@/components/panels/NodeEdgeList/EdgeList";
import { NodeList } from "@/components/panels/NodeEdgeList/NodeList";
import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";

afterEach(() => {
  cleanup();
  useProjectStore.getState().reset();
  useSelectionStore.getState().clearSelection();
});

describe("Elements pagination", () => {
  it.each(["nodes", "edges"] as const)(
    "bounds %s rows and preserves filtering and selection",
    (kind) => {
      useProjectStore.getState().setProject({
        ...useProjectStore.getState().project,
        nodes: Array.from({ length: 1000 }, (_, i) => ({
          id: `n${String(i).padStart(4, "0")}`,
          coordinate: { x: i, y: 0, z: i },
          role: "output",
          qubitIndex: i,
        })),
        edges: Array.from({ length: 999 }, (_, i) => ({
          id: `e${String(i).padStart(4, "0")}`,
          source: `n${i}`,
          target: `n${i + 1}`,
        })),
      });
      render(kind === "nodes" ? <NodeList /> : <EdgeList />);
      // 100 rows, two page buttons, one sort-direction button.
      expect(screen.getAllByRole("button")).toHaveLength(103);
      fireEvent.click(screen.getByRole("button", { name: "Next page" }));
      expect(screen.getByText(`101–200 of ${kind === "nodes" ? 1000 : 999}`)).toBeInTheDocument();
      const query = kind === "nodes" ? "n0500" : "e0500";
      fireEvent.change(screen.getByPlaceholderText(/Filter by ID/), { target: { value: query } });
      expect(screen.queryByRole("button", { name: "Next page" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: kind === "nodes" ? /n0500/ : /n500/ }));
      expect(
        kind === "nodes"
          ? useSelectionStore.getState().selectedNodeId
          : useSelectionStore.getState().selectedEdgeId
      ).toBe(query);
    }
  );
});
