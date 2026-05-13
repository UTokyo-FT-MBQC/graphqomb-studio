/**
 * CustomEdge regression tests.
 */

import { CustomEdge } from "@/components/canvas/CustomEdge";
import { render } from "@testing-library/react";
import { Position } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import { describe, expect, it } from "vitest";

describe("CustomEdge", () => {
  it("renders the path from live React Flow endpoints during drag", () => {
    const { container } = render(
      <svg>
        <title>Custom edge</title>
        <CustomEdge
          {...({
            id: "e0",
            type: "custom",
            source: "n0",
            sourcePosition: Position.Right,
            sourceX: 10,
            sourceY: 20,
            target: "n1",
            targetPosition: Position.Left,
            targetX: 110,
            targetY: 220,
            animated: false,
            selectable: true,
            deletable: true,
            selected: false,
            style: {},
            data: {
              offset: 0,
              sourceCenter: { x: 1, y: 2 },
              targetCenter: { x: 3, y: 4 },
            },
          } as EdgeProps)}
        />
      </svg>
    );

    expect(container.querySelector("path.react-flow__edge-path")).toHaveAttribute(
      "d",
      "M 10 20 L 110 220"
    );
  });
});
