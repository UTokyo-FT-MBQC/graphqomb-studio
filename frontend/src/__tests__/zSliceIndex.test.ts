import { describe, expect, it } from "vitest";
import { getGhostCandidateNodes, getGhostPosition } from "@/lib/geometry";
import { buildZSliceIndex } from "@/lib/zSliceIndex";
import type { GraphEdge, GraphNode } from "@/types";

function node(id: string, x: number, y: number, z: number): GraphNode {
  return { id, coordinate: { x, y, z }, role: "output", qubitIndex: 0 };
}

describe("Z slice index", () => {
  const nodes = [
    node("a", 0, 0, -1),
    node("b", 0, 0, 0),
    node("c", 2, 0, 0),
    node("d", 0, 0, 0.5),
    node("e", 0, 0, 1),
    node("f", 3, 2, 1000000),
  ];
  const edges: GraphEdge[] = [
    { id: "ab", source: "a", target: "b" },
    { id: "bc", source: "b", target: "c" },
    { id: "bd", source: "b", target: "d" },
    { id: "ae", source: "a", target: "e" },
    { id: "bf", source: "b", target: "f" },
  ];

  it.each([
    [-1, 1],
    [0, 0],
    [0, 1],
    [0.5, 0.5],
    [5, 10],
    [1000000, 1],
  ])("preserves visible nodes, ghost offsets, and incident edges at Z=%s, range=%s", (z, range) => {
    const slice = buildZSliceIndex(nodes, edges).getSlice(z, range);
    const visible = nodes.filter((n) => n.coordinate.z === z);
    const ghosts = getGhostCandidateNodes(nodes, z, range);
    expect(slice.visibleNodes).toEqual(visible);
    expect(slice.ghostNodes).toEqual(
      ghosts.map((n) => ({
        node: n,
        position: getGhostPosition(n, z, nodes, range),
        zOffset: n.coordinate.z - z,
      }))
    );
    const ids = new Set([...visible, ...ghosts].map((n) => n.id));
    const visibleIds = new Set(visible.map((n) => n.id));
    expect(slice.edges).toEqual(
      edges.filter(
        (e) =>
          ids.has(e.source) &&
          ids.has(e.target) &&
          (visibleIds.has(e.source) || visibleIds.has(e.target))
      )
    );
  });

  it("handles an empty graph", () => {
    expect(buildZSliceIndex([], []).getSlice(0, 1)).toEqual({
      visibleNodes: [],
      ghostNodes: [],
      edges: [],
    });
  });

  it("navigates 100,000 nodes without reading distant layers again", () => {
    let coordinateReads = 0;
    const largeNodes = Array.from(
      { length: 100000 },
      (_, i): GraphNode => ({
        id: `n${i}`,
        role: "output",
        qubitIndex: 0,
        get coordinate() {
          coordinateReads++;
          return { x: i % 100, y: 0, z: Math.floor(i / 100) };
        },
      })
    );
    let edgeReads = 0;
    const largeEdges = Array.from(
      { length: 99900 },
      (_, i): GraphEdge => ({
        id: `e${i}`,
        get source() {
          edgeReads++;
          return `n${i}`;
        },
        get target() {
          edgeReads++;
          return `n${i + 100}`;
        },
      })
    );
    const index = buildZSliceIndex(largeNodes, largeEdges);
    coordinateReads = 0;
    edgeReads = 0;
    for (const z of [1, 500, 998]) {
      const slice = index.getSlice(z, 1);
      expect(slice.visibleNodes).toHaveLength(100);
      expect(slice.ghostNodes).toHaveLength(200);
      expect(slice.edges).toHaveLength(200);
    }
    expect(coordinateReads).toBe(900);
    expect(edgeReads).toBeLessThanOrEqual(1800);
  });
});
