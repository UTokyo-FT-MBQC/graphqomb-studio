/**
 * Edge utility tests.
 */

import { calculateEdgeOffsets } from "@/lib/edgeUtils";
import type { EdgeWithPosition } from "@/lib/edgeUtils";
import { describe, expect, it } from "vitest";

function edge(
  id: string,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): EdgeWithPosition {
  return {
    id,
    source: `${id}-source`,
    target: `${id}-target`,
    position: { sourceX, sourceY, targetX, targetY },
  };
}

describe("edgeUtils", () => {
  it("offsets nearby parallel edges", () => {
    const offsets = calculateEdgeOffsets([edge("e1", 0, 0, 100, 0), edge("e2", 0, 10, 100, 10)]);

    expect(offsets.get("e1")).not.toBe(0);
    expect(offsets.get("e2")).not.toBe(0);
    expect(offsets.get("e1")).toBe(-(offsets.get("e2") ?? 0));
  });

  it("does not offset distant parallel edges", () => {
    const offsets = calculateEdgeOffsets([edge("e1", 0, 0, 100, 0), edge("e2", 0, 100, 100, 100)]);

    expect(offsets.get("e1")).toBe(0);
    expect(offsets.get("e2")).toBe(0);
  });

  it("keeps unrelated edge groups independent", () => {
    const offsets = calculateEdgeOffsets([
      edge("e1", 0, 0, 100, 0),
      edge("e2", 0, 10, 100, 10),
      edge("e3", 1000, 0, 1100, 0),
      edge("e4", 1000, 10, 1100, 10),
    ]);

    expect(offsets.get("e1")).toBe(-(offsets.get("e2") ?? 0));
    expect(offsets.get("e3")).toBe(-(offsets.get("e4") ?? 0));
    expect(offsets.get("e1")).toBe(offsets.get("e3"));
  });
});
