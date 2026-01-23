/**
 * RHG Generator Tests
 *
 * Tests for RHG lattice (rotated surface code with XXZZ boundaries) and cubic grid.
 *
 * RHG Structure:
 * - Lx, Ly: Number of data qubits in each direction
 * - Data qubits at (2i, 2j) for i ∈ [0, Lx-1], j ∈ [0, Ly-1]
 * - Ancillas at (odd, odd) adjacent to data qubits
 * - Even z: data + Z-ancillas, Odd z: data + X-ancillas
 */

import {
  estimateCubicEdgeCount,
  estimateCubicNodeCount,
  estimateRHGEdgeCount,
  estimateRHGNodeCount,
  generateCubicGrid,
  generateRHGLattice,
  getNodeRole,
  isDataPosition,
  isXAncillaPosition,
  isZAncillaPosition,
  rhgToGeneratedGraph,
} from "@/lib/tiling/rhg-generator";
import { describe, expect, it } from "vitest";

describe("2D Position Classification", () => {
  describe("isDataPosition", () => {
    it("should return true for (even, even) coordinates", () => {
      expect(isDataPosition(0, 0)).toBe(true);
      expect(isDataPosition(2, 0)).toBe(true);
      expect(isDataPosition(0, 2)).toBe(true);
      expect(isDataPosition(2, 2)).toBe(true);
      expect(isDataPosition(4, 6)).toBe(true);
    });

    it("should return false for non-(even, even) coordinates", () => {
      expect(isDataPosition(1, 0)).toBe(false);
      expect(isDataPosition(0, 1)).toBe(false);
      expect(isDataPosition(1, 1)).toBe(false);
      expect(isDataPosition(3, 5)).toBe(false);
    });
  });

  describe("isXAncillaPosition", () => {
    it("should return true for (odd, odd) where (x+y) % 4 == 0", () => {
      expect(isXAncillaPosition(1, 3)).toBe(true); // 1+3=4
      expect(isXAncillaPosition(3, 1)).toBe(true); // 3+1=4
      expect(isXAncillaPosition(3, 5)).toBe(true); // 3+5=8
      expect(isXAncillaPosition(5, 3)).toBe(true); // 5+3=8
    });

    it("should return false for (odd, odd) where (x+y) % 4 != 0", () => {
      expect(isXAncillaPosition(1, 1)).toBe(false); // 1+1=2
      expect(isXAncillaPosition(3, 3)).toBe(false); // 3+3=6
    });

    it("should return false for non-(odd, odd) coordinates", () => {
      expect(isXAncillaPosition(0, 0)).toBe(false);
      expect(isXAncillaPosition(2, 2)).toBe(false);
    });
  });

  describe("isZAncillaPosition", () => {
    it("should return true for (odd, odd) where (x+y) % 4 == 2", () => {
      expect(isZAncillaPosition(1, 1)).toBe(true); // 1+1=2
      expect(isZAncillaPosition(3, 3)).toBe(true); // 3+3=6
      expect(isZAncillaPosition(1, 5)).toBe(true); // 1+5=6
      expect(isZAncillaPosition(5, 1)).toBe(true); // 5+1=6
    });

    it("should return false for (odd, odd) where (x+y) % 4 != 2", () => {
      expect(isZAncillaPosition(1, 3)).toBe(false); // 1+3=4
      expect(isZAncillaPosition(3, 1)).toBe(false); // 3+1=4
    });
  });

  describe("getNodeRole", () => {
    it("should return data for (even, even) at any z", () => {
      expect(getNodeRole(0, 0, 0)).toBe("data");
      expect(getNodeRole(0, 0, 1)).toBe("data");
      expect(getNodeRole(2, 2, 0)).toBe("data");
      expect(getNodeRole(2, 2, 1)).toBe("data");
    });

    it("should return ancilla_z for Z-ancilla position at even z", () => {
      expect(getNodeRole(1, 1, 0)).toBe("ancilla_z");
      expect(getNodeRole(3, 3, 0)).toBe("ancilla_z");
      expect(getNodeRole(1, 1, 2)).toBe("ancilla_z");
    });

    it("should return ancilla_x for X-ancilla position at odd z", () => {
      expect(getNodeRole(1, 3, 1)).toBe("ancilla_x");
      expect(getNodeRole(3, 1, 1)).toBe("ancilla_x");
      expect(getNodeRole(1, 3, 3)).toBe("ancilla_x");
    });

    it("should return null for invalid positions", () => {
      expect(getNodeRole(1, 1, 1)).toBe(null); // Z-ancilla pos at odd z
      expect(getNodeRole(1, 3, 0)).toBe(null); // X-ancilla pos at even z
      expect(getNodeRole(1, 0, 0)).toBe(null); // Not valid
    });
  });
});

describe("RHG Lattice Generator", () => {
  describe("generateRHGLattice", () => {
    it("should generate lattice with correct data qubit count", () => {
      // Lx=2, Ly=2 should have 2*2=4 data qubits per layer
      const lattice = generateRHGLattice({ Lx: 2, Ly: 2, Lz: 2 });

      const dataNodes = lattice.nodes.filter((n) => n.role === "data");
      expect(dataNodes.length).toBe(4 * 2); // 4 data qubits * 2 layers
    });

    it("should place data qubits at (2i, 2j) positions", () => {
      const lattice = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 2 });

      const dataNodes = lattice.nodes.filter((n) => n.role === "data");
      const expectedPositions = new Set([
        "0_0",
        "0_2",
        "0_4",
        "2_0",
        "2_2",
        "2_4",
        "4_0",
        "4_2",
        "4_4",
      ]);

      for (const node of dataNodes) {
        const [x, y] = node.position;
        expect(expectedPositions.has(`${x}_${y}`)).toBe(true);
      }
    });

    it("should generate ancillas adjacent to data qubits", () => {
      const lattice = generateRHGLattice({ Lx: 2, Ly: 2, Lz: 2 });

      // For Lx=2, Ly=2: data at (0,0), (0,2), (2,0), (2,2)
      // Ancillas should be at (1,1) which is adjacent to all 4 data qubits
      const ancillaNodes = lattice.nodes.filter(
        (n) => n.role === "ancilla_x" || n.role === "ancilla_z"
      );

      expect(ancillaNodes.length).toBeGreaterThan(0);

      // Check that each ancilla has at least one neighboring data qubit
      const dataPositions = new Set(
        lattice.nodes
          .filter((n) => n.role === "data")
          .map((n) => `${n.position[0]}_${n.position[1]}`)
      );

      for (const ancilla of ancillaNodes) {
        const [ax, ay] = ancilla.position;
        let hasDataNeighbor = false;
        const offsets: [number, number][] = [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ];
        for (const offset of offsets) {
          if (dataPositions.has(`${ax + offset[0]}_${ay + offset[1]}`)) {
            hasDataNeighbor = true;
            break;
          }
        }
        expect(hasDataNeighbor).toBe(true);
      }
    });

    it("should place Z-ancillas at even z, X-ancillas at odd z", () => {
      const lattice = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 4 });

      for (const node of lattice.nodes) {
        const z = node.position[2];
        if (node.role === "ancilla_z") {
          expect(z % 2).toBe(0);
        } else if (node.role === "ancilla_x") {
          expect(z % 2).toBe(1);
        }
      }
    });

    it("should create temporal edges between data qubits at consecutive z", () => {
      const lattice = generateRHGLattice({ Lx: 2, Ly: 2, Lz: 3 });

      const nodeMap = new Map(lattice.nodes.map((n) => [n.id, n]));

      let temporalEdgeCount = 0;
      for (const edge of lattice.edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          const sameXY =
            source.position[0] === target.position[0] && source.position[1] === target.position[1];
          const zDiff = Math.abs(source.position[2] - target.position[2]);
          if (sameXY && zDiff === 1) {
            // Both should be data qubits
            expect(source.role).toBe("data");
            expect(target.role).toBe("data");
            temporalEdgeCount++;
          }
        }
      }

      // Should have temporal edges
      expect(temporalEdgeCount).toBeGreaterThan(0);
    });

    it("should create spatial edges from ancilla to data qubits", () => {
      const lattice = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 2 });

      const nodeMap = new Map(lattice.nodes.map((n) => [n.id, n]));

      let spatialEdgeCount = 0;
      for (const edge of lattice.edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          const sameZ = source.position[2] === target.position[2];
          const xDiff = Math.abs(source.position[0] - target.position[0]);
          const yDiff = Math.abs(source.position[1] - target.position[1]);

          // Spatial edge: same z, diagonal offset (±1, ±1)
          if (sameZ && xDiff === 1 && yDiff === 1) {
            spatialEdgeCount++;
            // One should be ancilla, one should be data
            const roles = [source.role, target.role];
            expect(roles).toContain("data");
            expect(roles.some((r) => r === "ancilla_x" || r === "ancilla_z")).toBe(true);
          }
        }
      }

      expect(spatialEdgeCount).toBeGreaterThan(0);
    });

    it("should throw error for invalid dimensions", () => {
      expect(() => generateRHGLattice({ Lx: 0, Ly: 1, Lz: 1 })).toThrow();
      expect(() => generateRHGLattice({ Lx: 1, Ly: 0, Lz: 1 })).toThrow();
      expect(() => generateRHGLattice({ Lx: 1, Ly: 1, Lz: 0 })).toThrow();
    });

    it("should generate unique node IDs", () => {
      const lattice = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 4 });
      const nodeIds = new Set(lattice.nodes.map((n) => n.id));
      expect(nodeIds.size).toBe(lattice.nodes.length);
    });

    it("should generate unique edge IDs", () => {
      const lattice = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 4 });
      const edgeIds = new Set(lattice.edges.map((e) => e.id));
      expect(edgeIds.size).toBe(lattice.edges.length);
    });

    it("should normalize edge source/target order", () => {
      const lattice = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 3 });

      for (const edge of lattice.edges) {
        expect(edge.source < edge.target).toBe(true);
        expect(edge.id).toBe(`${edge.source}--${edge.target}`);
      }
    });
  });

  describe("rhgToGeneratedGraph", () => {
    it("should convert RHG lattice to GeneratedGraph format", () => {
      const lattice = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 3 });
      const graph = rhgToGeneratedGraph(lattice);

      expect(graph.nodes.length).toBe(lattice.nodes.length);
      expect(graph.edges.length).toBe(lattice.edges.length);

      for (const node of graph.nodes) {
        expect(node.role).toBe("intermediate");
      }
    });

    it("should apply origin offset correctly", () => {
      const lattice = generateRHGLattice({ Lx: 2, Ly: 2, Lz: 2 });
      const graph = rhgToGeneratedGraph(lattice, { x: 10, y: 20, z: 30 });

      for (const originalNode of lattice.nodes) {
        const expectedX = originalNode.position[0] + 10;
        const expectedY = originalNode.position[1] + 20;
        const expectedZ = originalNode.position[2] + 30;
        const expectedId = `${expectedX}_${expectedY}_${expectedZ}`;

        const graphNode = graph.nodes.find((n) => n.id === expectedId);
        expect(graphNode).toBeDefined();
        if (graphNode) {
          expect(graphNode.position[0]).toBe(expectedX);
          expect(graphNode.position[1]).toBe(expectedY);
          expect(graphNode.position[2]).toBe(expectedZ);
        }
      }
    });
  });

  describe("estimateRHGNodeCount", () => {
    it("should correctly estimate node count", () => {
      for (const Lx of [2, 3, 4]) {
        for (const Ly of [2, 3, 4]) {
          for (const Lz of [2, 3, 4]) {
            const lattice = generateRHGLattice({ Lx, Ly, Lz });
            const estimate = estimateRHGNodeCount(Lx, Ly, Lz);
            expect(estimate).toBe(lattice.nodes.length);
          }
        }
      }
    });
  });

  describe("estimateRHGEdgeCount", () => {
    it("should correctly estimate edge count", () => {
      for (const Lx of [2, 3, 4]) {
        for (const Ly of [2, 3, 4]) {
          for (const Lz of [2, 3, 4]) {
            const lattice = generateRHGLattice({ Lx, Ly, Lz });
            const estimate = estimateRHGEdgeCount(Lx, Ly, Lz);
            expect(estimate).toBe(lattice.edges.length);
          }
        }
      }
    });
  });
});

describe("Cubic Grid Generator", () => {
  describe("generateCubicGrid", () => {
    it("should generate a 2x2x2 cubic grid", () => {
      const grid = generateCubicGrid(2, 2, 2);
      expect(grid.nodes.length).toBe(8);
      expect(grid.edges.length).toBe(12);
    });

    it("should generate a 3x3x3 cubic grid", () => {
      const grid = generateCubicGrid(3, 3, 3);
      expect(grid.nodes.length).toBe(27);
      expect(grid.edges.length).toBe(54);
    });

    it("should apply origin offset correctly", () => {
      const grid = generateCubicGrid(2, 2, 2, { x: 5, y: 10, z: 15 });
      const nodeIds = new Set(grid.nodes.map((n) => n.id));
      expect(nodeIds.has("5_10_15")).toBe(true);
      expect(nodeIds.has("6_11_16")).toBe(true);
    });

    it("should generate unique node IDs", () => {
      const grid = generateCubicGrid(4, 4, 4);
      const nodeIds = new Set(grid.nodes.map((n) => n.id));
      expect(nodeIds.size).toBe(grid.nodes.length);
    });

    it("should normalize edge source/target order", () => {
      const grid = generateCubicGrid(3, 3, 3);
      for (const edge of grid.edges) {
        expect(edge.source < edge.target).toBe(true);
      }
    });
  });

  describe("estimateCubicNodeCount", () => {
    it("should correctly estimate node count", () => {
      const grid = generateCubicGrid(4, 5, 6);
      const estimate = estimateCubicNodeCount(4, 5, 6);
      expect(estimate).toBe(grid.nodes.length);
    });
  });

  describe("estimateCubicEdgeCount", () => {
    it("should correctly estimate edge count", () => {
      const grid = generateCubicGrid(4, 5, 6);
      const estimate = estimateCubicEdgeCount(4, 5, 6);
      expect(estimate).toBe(grid.edges.length);
    });
  });
});

describe("RHG Boundary Conditions", () => {
  const XXZZ = { top: "X" as const, bottom: "X" as const, left: "Z" as const, right: "Z" as const };
  const ZZXX = { top: "Z" as const, bottom: "Z" as const, left: "X" as const, right: "X" as const };

  describe("XXZZ boundary", () => {
    it("should place X ancillas on top boundary at correct positions", () => {
      const lattice = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 2, boundary: XXZZ });

      // TOP boundary (y = -1), X ancillas should exist at relXMod4 === 1
      // Data qubits at y=0,2,4, so boundary is at y=-1
      // x positions in bulk: 1, 3 (odd positions)
      // relX = x - 0: 1 -> 1%4=1 (X), 3 -> 3%4=3 (not X for top)
      const topBoundaryXAncillas = lattice.nodes.filter(
        (n) => n.role === "ancilla_x" && n.position[1] === -1
      );
      expect(topBoundaryXAncillas.length).toBeGreaterThan(0);
      for (const node of topBoundaryXAncillas) {
        const relX = node.position[0];
        expect(relX % 4).toBe(1);
      }
    });

    it("should place Z ancillas on left boundary at correct positions", () => {
      const lattice = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 2, boundary: XXZZ });

      // LEFT boundary (x = -1), Z ancillas should exist at relYMod4 === 3
      const leftBoundaryZAncillas = lattice.nodes.filter(
        (n) => n.role === "ancilla_z" && n.position[0] === -1
      );
      expect(leftBoundaryZAncillas.length).toBeGreaterThan(0);
      for (const node of leftBoundaryZAncillas) {
        const relY = node.position[1];
        expect(relY % 4).toBe(3);
      }
    });
  });

  describe("ZZXX boundary", () => {
    it("should place Z ancillas on top boundary at correct positions", () => {
      const lattice = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 2, boundary: ZZXX });

      // TOP boundary (y = -1), Z ancillas should exist at relXMod4 === 3
      const topBoundaryZAncillas = lattice.nodes.filter(
        (n) => n.role === "ancilla_z" && n.position[1] === -1
      );
      expect(topBoundaryZAncillas.length).toBeGreaterThan(0);
      for (const node of topBoundaryZAncillas) {
        const relX = node.position[0];
        expect(relX % 4).toBe(3);
      }
    });

    it("should place X ancillas on left boundary at correct positions", () => {
      const lattice = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 2, boundary: ZZXX });

      // LEFT boundary (x = -1), X ancillas should exist at relYMod4 === 1
      const leftBoundaryXAncillas = lattice.nodes.filter(
        (n) => n.role === "ancilla_x" && n.position[0] === -1
      );
      expect(leftBoundaryXAncillas.length).toBeGreaterThan(0);
      for (const node of leftBoundaryXAncillas) {
        const relY = node.position[1];
        expect(relY % 4).toBe(1);
      }
    });
  });

  describe("boundary consistency", () => {
    it("should generate different lattices for XXZZ and ZZXX", () => {
      const xxzz = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 2, boundary: XXZZ });
      const zzxx = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 2, boundary: ZZXX });

      // Boundary ancilla positions should differ
      const xxzzBoundaryNodes = xxzz.nodes.filter(
        (n) =>
          n.position[0] === -1 || n.position[1] === -1 || n.position[0] === 5 || n.position[1] === 5
      );
      const zzxxBoundaryNodes = zzxx.nodes.filter(
        (n) =>
          n.position[0] === -1 || n.position[1] === -1 || n.position[0] === 5 || n.position[1] === 5
      );

      // Sort by id for comparison
      const xxzzIds = xxzzBoundaryNodes.map((n) => n.id).sort();
      const zzxxIds = zzxxBoundaryNodes.map((n) => n.id).sort();

      // Boundaries are different, so IDs should differ
      expect(xxzzIds).not.toEqual(zzxxIds);
    });

    it("should produce same bulk nodes regardless of boundary", () => {
      const xxzz = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 2, boundary: XXZZ });
      const zzxx = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 2, boundary: ZZXX });

      // Bulk nodes are inside the data region, so same for both
      const xxzzBulkNodes = xxzz.nodes.filter(
        (n) => n.position[0] >= 0 && n.position[0] <= 4 && n.position[1] >= 0 && n.position[1] <= 4
      );
      const zzxxBulkNodes = zzxx.nodes.filter(
        (n) => n.position[0] >= 0 && n.position[0] <= 4 && n.position[1] >= 0 && n.position[1] <= 4
      );

      const xxzzBulkIds = xxzzBulkNodes.map((n) => n.id).sort();
      const zzxxBulkIds = zzxxBulkNodes.map((n) => n.id).sort();

      expect(xxzzBulkIds).toEqual(zzxxBulkIds);
    });
  });
});
