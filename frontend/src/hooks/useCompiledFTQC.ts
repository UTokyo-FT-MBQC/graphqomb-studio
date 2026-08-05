/** Resolve FTQC closure groups through the GraphQOMB backend. */

"use client";

import { compileFTQC, isApiError } from "@/lib/api";
import { useCompiledFTQCStore } from "@/stores/compiledFTQCStore";
import { useProjectStore } from "@/stores/projectStore";
import { type CompiledFTQCDefinition, toPayload } from "@/types";
import { useEffect, useMemo } from "react";

const FTQC_COMPILATION_CACHE_VERSION = 2;

export function useCompiledFTQC(enabled: boolean): {
  compiledFTQC: CompiledFTQCDefinition | null;
  isLoading: boolean;
  error: string | null;
} {
  const project = useProjectStore((state) => state.project);
  const compiledFTQC = useCompiledFTQCStore((state) => state.compiledFTQC);
  const isLoading = useCompiledFTQCStore((state) => state.isLoading);
  const error = useCompiledFTQCStore((state) => state.error);
  const beginCompilation = useCompiledFTQCStore((state) => state.beginCompilation);
  const setCompiledFTQC = useCompiledFTQCStore((state) => state.setCompiledFTQC);
  const setError = useCompiledFTQCStore((state) => state.setError);
  const clear = useCompiledFTQCStore((state) => state.clear);

  const sourceKey = useMemo(
    () =>
      JSON.stringify({
        cacheVersion: FTQC_COMPILATION_CACHE_VERSION,
        nodes: project.nodes.map(({ id, role, measBasis, inputBasis }) => ({
          id,
          role,
          measBasis,
          inputBasis,
        })),
        edges: project.edges,
        flow: project.flow,
        ftqc: project.ftqc,
      }),
    [project.edges, project.flow, project.ftqc, project.nodes]
  );

  useEffect(() => {
    if (!enabled) return;
    if (project.ftqc === undefined) {
      clear();
      return;
    }
    if (!beginCompilation(sourceKey)) return;

    void compileFTQC(toPayload(project))
      .then((result) => setCompiledFTQC(sourceKey, result))
      .catch((cause: unknown) => {
        const message = isApiError(cause)
          ? cause.detail
          : cause instanceof Error
            ? cause.message
            : "Failed to compile FTQC groups";
        setError(sourceKey, message);
      });
  }, [beginCompilation, clear, enabled, project, setCompiledFTQC, setError, sourceKey]);

  return { compiledFTQC, isLoading, error };
}
