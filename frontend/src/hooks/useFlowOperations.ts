/**
 * Flow Operations Hook
 *
 * Provides business logic for flow editing operations.
 * Encapsulates X-Flow and Z-Flow manipulation.
 */

"use client";

import { useProjectStore } from "@/stores/projectStore";
import { useCallback, useMemo } from "react";

export function useFlowOperations(nodeId: string) {
  const project = useProjectStore((state) => state.project);
  const updateXFlow = useProjectStore((state) => state.updateXFlow);
  const updateFlow = useProjectStore((state) => state.updateFlow);

  // Current X-Flow targets for this node
  const xflowTargets = useMemo(() => {
    return project.flow.xflow[nodeId] ?? [];
  }, [project.flow.xflow, nodeId]);

  // Add a target to X-Flow
  const addXFlowTarget = useCallback(
    (targetId: string) => {
      if (!xflowTargets.includes(targetId)) {
        updateXFlow(nodeId, [...xflowTargets, targetId]);
      }
    },
    [nodeId, xflowTargets, updateXFlow]
  );

  // Remove a target from X-Flow
  const removeXFlowTarget = useCallback(
    (targetId: string) => {
      updateXFlow(
        nodeId,
        xflowTargets.filter((t) => t !== targetId)
      );
    },
    [nodeId, xflowTargets, updateXFlow]
  );

  // Check if Z-Flow is in auto mode
  const isZFlowAuto = project.flow.zflow === "auto";

  // Current Z-Flow targets for this node (only when manual)
  const zflowTargets = useMemo(() => {
    if (project.flow.zflow === "auto") {
      return [];
    }
    return project.flow.zflow[nodeId] ?? [];
  }, [project.flow.zflow, nodeId]);

  // Set Z-Flow to auto mode
  const setZFlowAuto = useCallback(() => {
    updateFlow({ ...project.flow, zflow: "auto" });
  }, [project.flow, updateFlow]);

  // Set Z-Flow to manual mode (initializes with current xflow as base)
  const setZFlowManual = useCallback(() => {
    // Initialize manual zflow with empty entries for all nodes
    const manualZflow: Record<string, string[]> = {};
    for (const node of project.nodes) {
      if (node.role !== "output") {
        manualZflow[node.id] = [];
      }
    }
    updateFlow({ ...project.flow, zflow: manualZflow });
  }, [project.flow, project.nodes, updateFlow]);

  // Update Z-Flow targets for this node (only when manual)
  const updateZFlowTargets = useCallback(
    (targets: string[]) => {
      if (project.flow.zflow === "auto") {
        return;
      }
      updateFlow({
        ...project.flow,
        zflow: {
          ...project.flow.zflow,
          [nodeId]: targets,
        },
      });
    },
    [nodeId, project.flow, updateFlow]
  );

  // Add a target to Z-Flow
  const addZFlowTarget = useCallback(
    (targetId: string) => {
      if (!zflowTargets.includes(targetId)) {
        updateZFlowTargets([...zflowTargets, targetId]);
      }
    },
    [zflowTargets, updateZFlowTargets]
  );

  // Remove a target from Z-Flow
  const removeZFlowTarget = useCallback(
    (targetId: string) => {
      updateZFlowTargets(zflowTargets.filter((t) => t !== targetId));
    },
    [zflowTargets, updateZFlowTargets]
  );

  // Available target nodes (all nodes except self and output nodes)
  const availableTargets = useMemo(() => {
    return project.nodes.filter((n) => n.id !== nodeId && n.role !== "output").map((n) => n.id);
  }, [project.nodes, nodeId]);

  // Available X-Flow targets (not already selected)
  const availableXFlowTargets = useMemo(() => {
    return availableTargets.filter((id) => !xflowTargets.includes(id));
  }, [availableTargets, xflowTargets]);

  // Available Z-Flow targets (not already selected)
  const availableZFlowTargets = useMemo(() => {
    return availableTargets.filter((id) => !zflowTargets.includes(id));
  }, [availableTargets, zflowTargets]);

  return {
    // X-Flow
    xflowTargets,
    addXFlowTarget,
    removeXFlowTarget,
    availableXFlowTargets,

    // Z-Flow
    isZFlowAuto,
    zflowTargets,
    setZFlowAuto,
    setZFlowManual,
    addZFlowTarget,
    removeZFlowTarget,
    availableZFlowTargets,

    // General
    availableTargets,
  };
}
