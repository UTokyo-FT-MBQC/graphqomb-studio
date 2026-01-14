/**
 * RHG Generator Tests
 *
 * Tests for RHG lattice and cubic grid generation.
 */

import {
  estimateCubicEdgeCount,
  estimateCubicNodeCount,
  estimateRHGEdgeCount,
  estimateRHGNodeCount,
  generateCubicGrid,
  generateRHGLattice,
  rhgToGeneratedGraph,
} from "@/lib/tiling/rhg-generator";
import { describe, expect, it } from "vitest";

describe("RHG Lattice Generator", () => {
  describe("generateRHGLattice", () => {
    it("should generate a minimal 1x1x1 RHG lattice", () => {
      const lattice = generateRHGLattice({ Lx: 1, Ly: 1, Lz: 1 });

      // Verify node counts according to spec
      // Ex: 1 * 2 * 2 = 4
      // Ey: 2 * 1 * 2 = 4
      // Ez: 2 * 2 * 1 = 4
      // Fz: 1 * 1 * 2 = 2
      // Fy: 1 * 2 * 1 = 2
      // Fx: 2 * 1 * 1 = 2
      // Total: 18 nodes
      const expectedNodeCount = estimateRHGNodeCount(1, 1, 1);
      expect(lattice.nodes.length).toBe(expectedNodeCount);
      expect(lattice.nodes.length).toBe(18);

      // Each face connects to 4 edges
      // Fz: 2 * 4 = 8
      // Fy: 2 * 4 = 8
      // Fx: 2 * 4 = 8
      // Total: 24 edges
      const expectedEdgeCount = estimateRHGEdgeCount(1, 1, 1);
      expect(lattice.edges.length).toBe(expectedEdgeCount);
      expect(lattice.edges.length).toBe(24);

      // Verify size is stored
      expect(lattice.size).toEqual({ Lx: 1, Ly: 1, Lz: 1 });
    });

    it("should generate a 2x2x2 RHG lattice", () => {
      const lattice = generateRHGLattice({ Lx: 2, Ly: 2, Lz: 2 });

      const expectedNodeCount = estimateRHGNodeCount(2, 2, 2);
      expect(lattice.nodes.length).toBe(expectedNodeCount);

      const expectedEdgeCount = estimateRHGEdgeCount(2, 2, 2);
      expect(lattice.edges.length).toBe(expectedEdgeCount);
    });

    it("should produce only FACE-EDGE connections (bipartite graph)", () => {
      const lattice = generateRHGLattice({ Lx: 2, Ly: 2, Lz: 2 });

      const nodeKinds = new Map(lattice.nodes.map((n) => [n.id, n.kind]));

      for (const edge of lattice.edges) {
        const faceKind = nodeKinds.get(edge.faceId);
        const edgeKind = nodeKinds.get(edge.edgeId);

        expect(faceKind).toBe("FACE");
        expect(edgeKind).toBe("EDGE");
      }
    });

    it("should generate unique node IDs", () => {
      const lattice = generateRHGLattice({ Lx: 2, Ly: 2, Lz: 2 });

      const nodeIds = new Set(lattice.nodes.map((n) => n.id));
      expect(nodeIds.size).toBe(lattice.nodes.length);
    });

    it("should generate correct node ID format", () => {
      const lattice = generateRHGLattice({ Lx: 1, Ly: 1, Lz: 1 });

      // Check some specific node IDs exist
      const nodeIds = new Set(lattice.nodes.map((n) => n.id));
      expect(nodeIds.has("Ex(0,0,0)")).toBe(true);
      expect(nodeIds.has("Ey(0,0,0)")).toBe(true);
      expect(nodeIds.has("Ez(0,0,0)")).toBe(true);
      expect(nodeIds.has("Fz(0,0,0)")).toBe(true);
      expect(nodeIds.has("Fy(0,0,0)")).toBe(true);
      expect(nodeIds.has("Fx(0,0,0)")).toBe(true);
    });

    it("should assign correct orientations to nodes", () => {
      const lattice = generateRHGLattice({ Lx: 1, Ly: 1, Lz: 1 });

      for (const node of lattice.nodes) {
        if (node.orientation === "Ex") {
          expect(node.kind).toBe("EDGE");
          expect(node.id).toMatch(/^Ex\(\d+,\d+,\d+\)$/);
        } else if (node.orientation === "Fz") {
          expect(node.kind).toBe("FACE");
          expect(node.id).toMatch(/^Fz\(\d+,\d+,\d+\)$/);
        }
      }
    });

    it("should generate correct pos2 coordinates for Ex nodes", () => {
      const lattice = generateRHGLattice({ Lx: 2, Ly: 2, Lz: 2 });

      const exNodes = lattice.nodes.filter((n) => n.orientation === "Ex");
      for (const node of exNodes) {
        const [i, j, k] = node.indices;
        // Ex(i,j,k): pos2 = (2i+1, 2j, 2k)
        expect(node.pos2).toEqual([2 * i + 1, 2 * j, 2 * k]);
        // position = pos2 / 2
        expect(node.position).toEqual([node.pos2[0] / 2, node.pos2[1] / 2, node.pos2[2] / 2]);
      }
    });

    it("should generate correct pos2 coordinates for Fz nodes", () => {
      const lattice = generateRHGLattice({ Lx: 2, Ly: 2, Lz: 2 });

      const fzNodes = lattice.nodes.filter((n) => n.orientation === "Fz");
      for (const node of fzNodes) {
        const [i, j, k] = node.indices;
        // Fz(i,j,k): pos2 = (2i+1, 2j+1, 2k)
        expect(node.pos2).toEqual([2 * i + 1, 2 * j + 1, 2 * k]);
      }
    });

    it("should throw error for invalid dimensions", () => {
      expect(() => generateRHGLattice({ Lx: 0, Ly: 1, Lz: 1 })).toThrow();
      expect(() => generateRHGLattice({ Lx: 1, Ly: 0, Lz: 1 })).toThrow();
      expect(() => generateRHGLattice({ Lx: 1, Ly: 1, Lz: 0 })).toThrow();
    });

    it("should verify Fz connects to correct edge nodes", () => {
      const lattice = generateRHGLattice({ Lx: 2, Ly: 2, Lz: 2 });

      // Find Fz(0,0,0) and check its connections
      const fz000 = lattice.nodes.find((n) => n.id === "Fz(0,0,0)");
      expect(fz000).toBeDefined();

      // Fz(i,j,k) connects to: Ex(i,j,k), Ex(i,j+1,k), Ey(i,j,k), Ey(i+1,j,k)
      // For Fz(0,0,0): Ex(0,0,0), Ex(0,1,0), Ey(0,0,0), Ey(1,0,0)
      const fz000Edges = lattice.edges.filter((e) => e.faceId === "Fz(0,0,0)");
      const connectedEdgeIds = new Set(fz000Edges.map((e) => e.edgeId));

      expect(connectedEdgeIds.has("Ex(0,0,0)")).toBe(true);
      expect(connectedEdgeIds.has("Ex(0,1,0)")).toBe(true);
      expect(connectedEdgeIds.has("Ey(0,0,0)")).toBe(true);
      expect(connectedEdgeIds.has("Ey(1,0,0)")).toBe(true);
      expect(fz000Edges.length).toBe(4);
    });
  });

  describe("rhgToGeneratedGraph", () => {
    it("should convert RHG lattice to GeneratedGraph format", () => {
      const lattice = generateRHGLattice({ Lx: 1, Ly: 1, Lz: 1 });
      const graph = rhgToGeneratedGraph(lattice);

      expect(graph.nodes.length).toBe(lattice.nodes.length);
      expect(graph.edges.length).toBe(lattice.edges.length);

      // All nodes should be intermediate role
      for (const node of graph.nodes) {
        expect(node.role).toBe("intermediate");
      }
    });

    it("should apply origin offset correctly", () => {
      const lattice = generateRHGLattice({ Lx: 1, Ly: 1, Lz: 1 });
      const graph = rhgToGeneratedGraph(lattice, { x: 10, y: 20, z: 30 });

      // Find a node and check its position includes the offset
      const exNode = lattice.nodes.find((n) => n.id === "Ex(0,0,0)");
      const graphNode = graph.nodes.find((n) => n.id === "Ex(0,0,0)");

      expect(graphNode).toBeDefined();
      if (exNode && graphNode) {
        expect(graphNode.position[0]).toBe(exNode.position[0] + 10);
        expect(graphNode.position[1]).toBe(exNode.position[1] + 20);
        expect(graphNode.position[2]).toBe(exNode.position[2] + 30);
      }
    });

    it("should normalize edge IDs correctly", () => {
      const lattice = generateRHGLattice({ Lx: 1, Ly: 1, Lz: 1 });
      const graph = rhgToGeneratedGraph(lattice);

      for (const edge of graph.edges) {
        // Source should be lexicographically smaller than target
        expect(edge.source < edge.target).toBe(true);
        // ID should be source--target format
        expect(edge.id).toBe(`${edge.source}--${edge.target}`);
      }
    });
  });

  describe("estimateRHGNodeCount", () => {
    it("should correctly estimate node count for 1x1x1", () => {
      const lattice = generateRHGLattice({ Lx: 1, Ly: 1, Lz: 1 });
      const estimate = estimateRHGNodeCount(1, 1, 1);
      expect(estimate).toBe(lattice.nodes.length);
    });

    it("should correctly estimate node count for 3x3x3", () => {
      const lattice = generateRHGLattice({ Lx: 3, Ly: 3, Lz: 3 });
      const estimate = estimateRHGNodeCount(3, 3, 3);
      expect(estimate).toBe(lattice.nodes.length);
    });
  });

  describe("estimateRHGEdgeCount", () => {
    it("should correctly estimate edge count for 1x1x1", () => {
      const lattice = generateRHGLattice({ Lx: 1, Ly: 1, Lz: 1 });
      const estimate = estimateRHGEdgeCount(1, 1, 1);
      expect(estimate).toBe(lattice.edges.length);
    });

    it("should correctly estimate edge count for 2x2x2", () => {
      const lattice = generateRHGLattice({ Lx: 2, Ly: 2, Lz: 2 });
      const estimate = estimateRHGEdgeCount(2, 2, 2);
      expect(estimate).toBe(lattice.edges.length);
    });
  });
});

describe("Cubic Grid Generator", () => {
  describe("generateCubicGrid", () => {
    it("should generate a 1x1x1 cubic grid", () => {
      const grid = generateCubicGrid(1, 1, 1);

      // For 1x1x1, we have 2x2x2 = 8 vertices
      expect(grid.nodes.length).toBe(8);

      // Edges: 1*2*2 + 2*1*2 + 2*2*1 = 4 + 4 + 4 = 12
      expect(grid.edges.length).toBe(12);
    });

    it("should generate a 2x2x2 cubic grid", () => {
      const grid = generateCubicGrid(2, 2, 2);

      // For 2x2x2, we have 3x3x3 = 27 vertices
      expect(grid.nodes.length).toBe(27);

      // Edges: 2*3*3 + 3*2*3 + 3*3*2 = 18 + 18 + 18 = 54
      expect(grid.edges.length).toBe(54);
    });

    it("should apply origin offset correctly", () => {
      const grid = generateCubicGrid(1, 1, 1, { x: 5, y: 10, z: 15 });

      // Check that node IDs include offset
      const nodeIds = new Set(grid.nodes.map((n) => n.id));
      expect(nodeIds.has("5_10_15")).toBe(true);
      expect(nodeIds.has("6_11_16")).toBe(true);

      // Check positions include offset
      const originNode = grid.nodes.find((n) => n.id === "5_10_15");
      expect(originNode?.position).toEqual([5, 10, 15]);
    });

    it("should generate unique node IDs", () => {
      const grid = generateCubicGrid(3, 3, 3);
      const nodeIds = new Set(grid.nodes.map((n) => n.id));
      expect(nodeIds.size).toBe(grid.nodes.length);
    });

    it("should generate unique edge IDs", () => {
      const grid = generateCubicGrid(3, 3, 3);
      const edgeIds = new Set(grid.edges.map((e) => e.id));
      expect(edgeIds.size).toBe(grid.edges.length);
    });

    it("should normalize edge source/target order", () => {
      const grid = generateCubicGrid(2, 2, 2);

      for (const edge of grid.edges) {
        expect(edge.source < edge.target).toBe(true);
      }
    });
  });

  describe("estimateCubicNodeCount", () => {
    it("should correctly estimate node count", () => {
      const grid = generateCubicGrid(3, 4, 5);
      const estimate = estimateCubicNodeCount(3, 4, 5);
      expect(estimate).toBe(grid.nodes.length);
    });
  });

  describe("estimateCubicEdgeCount", () => {
    it("should correctly estimate edge count", () => {
      const grid = generateCubicGrid(3, 4, 5);
      const estimate = estimateCubicEdgeCount(3, 4, 5);
      expect(estimate).toBe(grid.edges.length);
    });
  });
});
