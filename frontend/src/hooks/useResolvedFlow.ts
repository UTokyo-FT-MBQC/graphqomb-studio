/**
 * useResolvedFlow Hook
 *
 * Resolves zflow="auto" by calling the backend API.
 * Caches the resolved flow in resolvedFlowStore.
 */

"use client";

import { computeZFlow } from "@/lib/api";
import { useProjectStore } from "@/stores/projectStore";
import { useResolvedFlowStore } from "@/stores/resolvedFlowStore";
import type { ResolvedFlow } from "@/types";
import { toPayload } from "@/types";
import { useCallback, useEffect, useRef } from "react";

export function useResolvedFlow(): {
  resolvedFlow: ResolvedFlow | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const project = useProjectStore((state) => state.project);
  const { resolvedFlow, isLoading, error, setResolvedFlow, setLoading, setError, clear } =
    useResolvedFlowStore();

  // Track previous dependency key to detect changes
  const prevDepsKeyRef = useRef<string | null>(null);

  // Compute a dependency key for cache invalidation
  const depsKey = JSON.stringify({
    xflow: project.flow.xflow,
    zflow: project.flow.zflow,
    nodeIds: project.nodes.map((n) => n.id),
    edgeIds: project.edges.map((e) => e.id),
  });

  const fetchResolvedFlow = useCallback(async () => {
    // If zflow is not "auto", resolve directly without API call
    if (project.flow.zflow !== "auto") {
      setResolvedFlow({
        xflow: project.flow.xflow,
        zflow: project.flow.zflow,
      });
      return;
    }

    // Skip if no nodes or xflow is empty
    if (project.nodes.length === 0 || Object.keys(project.flow.xflow).length === 0) {
      setResolvedFlow({
        xflow: project.flow.xflow,
        zflow: {},
      });
      return;
    }

    setLoading(true);
    try {
      const payload = toPayload(project);
      const computedZflow = await computeZFlow(payload);
      setResolvedFlow({
        xflow: project.flow.xflow,
        zflow: computedZflow,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to compute zflow";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [project, setResolvedFlow, setLoading, setError]);

  // Auto-refresh when dependencies change
  useEffect(() => {
    if (prevDepsKeyRef.current !== depsKey) {
      prevDepsKeyRef.current = depsKey;
      void fetchResolvedFlow();
    }
  }, [depsKey, fetchResolvedFlow]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  return {
    resolvedFlow,
    isLoading,
    error,
    refresh: fetchResolvedFlow,
  };
}
