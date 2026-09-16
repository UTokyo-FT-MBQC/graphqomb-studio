import { GHOST_OFFSET } from "@/lib/geometry";
import type { GraphEdge, GraphNode } from "@/types";

export interface SliceGhost {
  node: GraphNode;
  position: { x: number; y: number };
  zOffset: number;
}

function append<T>(map: Map<number, T[]>, z: number, value: T): void {
  const bucket = map.get(z);
  if (bucket === undefined) map.set(z, [value]);
  else bucket.push(value);
}

/** Build once per graph change; slice navigation only visits nearby layers and incident edges. */
export function buildZSliceIndex(nodes: readonly GraphNode[], edges: readonly GraphEdge[]) {
  const nodesByZ = new Map<number, GraphNode[]>();
  const nodeZ = new Map<string, number>();
  const edgesByZ = new Map<number, GraphEdge[]>();
  for (const node of nodes) {
    append(nodesByZ, node.coordinate.z, node);
    nodeZ.set(node.id, node.coordinate.z);
  }
  for (const edge of edges) {
    const sourceZ = nodeZ.get(edge.source);
    const targetZ = nodeZ.get(edge.target);
    if (sourceZ === undefined || targetZ === undefined) continue;
    append(edgesByZ, sourceZ, edge);
    if (targetZ !== sourceZ) append(edgesByZ, targetZ, edge);
  }
  const levels = [...nodesByZ.keys()].sort((a, b) => a - b);

  return {
    getSlice(currentZ: number, ghostRange: number) {
      const visibleNodes = nodesByZ.get(currentZ) ?? [];
      const occupiedXY = new Set(visibleNodes.map(({ coordinate: { x, y } }) => `${x}:${y}`));
      const ghostNodes: SliceGhost[] = [];
      const ghostIds = new Set<string>();

      // Lower bound supports sparse and fractional Z coordinates without scanning all levels.
      let low = 0;
      let high = levels.length;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if ((levels[mid] ?? Infinity) < currentZ - ghostRange) low = mid + 1;
        else high = mid;
      }
      for (let i = low; i < levels.length; i++) {
        const z = levels[i];
        if (z === undefined || z > currentZ + ghostRange) break;
        if (z === currentZ) continue;
        for (const node of nodesByZ.get(z) ?? []) {
          const { x, y } = node.coordinate;
          const zOffset = z - currentZ;
          const offset = occupiedXY.has(`${x}:${y}`) ? GHOST_OFFSET * Math.sign(zOffset) : 0;
          ghostNodes.push({ node, position: { x: x + offset, y: y + offset }, zOffset });
          ghostIds.add(node.id);
        }
      }

      const visibleIds = new Set(visibleNodes.map((node) => node.id));
      const sliceEdges = (edgesByZ.get(currentZ) ?? []).filter(
        (edge) =>
          (visibleIds.has(edge.source) || ghostIds.has(edge.source)) &&
          (visibleIds.has(edge.target) || ghostIds.has(edge.target))
      );
      return { visibleNodes, ghostNodes, edges: sliceEdges };
    },
  };
}
