/**
 * FTQC Operations Hook
 *
 * Provides business logic for FTQC (Fault-Tolerant Quantum Computing) editing operations.
 * Encapsulates parity check group and logical observable group manipulation.
 */

"use client";

import { useProjectStore } from "@/stores/projectStore";
import { useCallback, useMemo } from "react";

export function useFTQCOperations() {
  const project = useProjectStore((state) => state.project);
  const addParityCheckGroup = useProjectStore((state) => state.addParityCheckGroup);
  const removeParityCheckGroup = useProjectStore((state) => state.removeParityCheckGroup);
  const updateParityCheckGroup = useProjectStore((state) => state.updateParityCheckGroup);
  const setLogicalObservable = useProjectStore((state) => state.setLogicalObservable);
  const removeLogicalObservable = useProjectStore((state) => state.removeLogicalObservable);

  // Current parity check groups
  const parityCheckGroups = useMemo(() => {
    return project.ftqc?.parityCheckGroup ?? [];
  }, [project.ftqc?.parityCheckGroup]);

  // Current logical observable groups
  const logicalObservableGroups = useMemo(() => {
    return project.ftqc?.logicalObservableGroup ?? {};
  }, [project.ftqc?.logicalObservableGroup]);

  // Available nodes (all nodes except output nodes, since they have no measurement basis)
  const availableNodes = useMemo(() => {
    return project.nodes.filter((n) => n.role !== "output").map((n) => n.id);
  }, [project.nodes]);

  // Parity Check Group operations
  const addNewParityCheckGroup = useCallback(() => {
    addParityCheckGroup([]);
  }, [addParityCheckGroup]);

  const deleteParityCheckGroup = useCallback(
    (index: number) => {
      removeParityCheckGroup(index);
    },
    [removeParityCheckGroup]
  );

  const addNodeToParityGroup = useCallback(
    (groupIndex: number, nodeId: string) => {
      const group = parityCheckGroups[groupIndex];
      if (group !== undefined && !group.includes(nodeId)) {
        updateParityCheckGroup(groupIndex, [...group, nodeId]);
      }
    },
    [parityCheckGroups, updateParityCheckGroup]
  );

  const removeNodeFromParityGroup = useCallback(
    (groupIndex: number, nodeId: string) => {
      const group = parityCheckGroups[groupIndex];
      if (group !== undefined) {
        updateParityCheckGroup(
          groupIndex,
          group.filter((n) => n !== nodeId)
        );
      }
    },
    [parityCheckGroups, updateParityCheckGroup]
  );

  // Get available nodes for a specific parity group (not already in the group)
  const getAvailableNodesForParityGroup = useCallback(
    (groupIndex: number) => {
      const group = parityCheckGroups[groupIndex] ?? [];
      return availableNodes.filter((id) => !group.includes(id));
    },
    [parityCheckGroups, availableNodes]
  );

  // Logical Observable operations
  const addNewLogicalObservable = useCallback(() => {
    // Find the next available key (integer as string)
    const existingKeys = Object.keys(logicalObservableGroups).map((k) => Number.parseInt(k, 10));
    const nextKey = existingKeys.length === 0 ? 0 : Math.max(...existingKeys) + 1;
    setLogicalObservable(nextKey.toString(), []);
  }, [logicalObservableGroups, setLogicalObservable]);

  const deleteLogicalObservable = useCallback(
    (key: string) => {
      removeLogicalObservable(key);
    },
    [removeLogicalObservable]
  );

  const addNodeToLogicalObservable = useCallback(
    (key: string, nodeId: string) => {
      const targets = logicalObservableGroups[key] ?? [];
      if (!targets.includes(nodeId)) {
        setLogicalObservable(key, [...targets, nodeId]);
      }
    },
    [logicalObservableGroups, setLogicalObservable]
  );

  const removeNodeFromLogicalObservable = useCallback(
    (key: string, nodeId: string) => {
      const targets = logicalObservableGroups[key] ?? [];
      setLogicalObservable(
        key,
        targets.filter((n) => n !== nodeId)
      );
    },
    [logicalObservableGroups, setLogicalObservable]
  );

  // Get available nodes for a specific logical observable (not already in it)
  const getAvailableNodesForObservable = useCallback(
    (key: string) => {
      const targets = logicalObservableGroups[key] ?? [];
      return availableNodes.filter((id) => !targets.includes(id));
    },
    [logicalObservableGroups, availableNodes]
  );

  // Check if FTQC has any data
  const hasFTQCData = useMemo(() => {
    return parityCheckGroups.length > 0 || Object.keys(logicalObservableGroups).length > 0;
  }, [parityCheckGroups, logicalObservableGroups]);

  return {
    // Parity Check Groups
    parityCheckGroups,
    addNewParityCheckGroup,
    deleteParityCheckGroup,
    addNodeToParityGroup,
    removeNodeFromParityGroup,
    getAvailableNodesForParityGroup,

    // Logical Observable Groups
    logicalObservableGroups,
    addNewLogicalObservable,
    deleteLogicalObservable,
    addNodeToLogicalObservable,
    removeNodeFromLogicalObservable,
    getAvailableNodesForObservable,

    // General
    availableNodes,
    hasFTQCData,
  };
}
