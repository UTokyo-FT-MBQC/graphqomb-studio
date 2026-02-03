/**
 * FTQC Highlight Context
 *
 * Provides computed FTQC highlight map to canvas components.
 * Avoids per-node recomputation by calculating highlights once at canvas level.
 */

"use client";

import type { FTQCHighlight } from "@/lib/ftqcColors";
import { createContext, useContext } from "react";

export type FTQCHighlightMap = Map<string, FTQCHighlight>;

const FTQCHighlightContext = createContext<FTQCHighlightMap>(new Map());

export function FTQCHighlightProvider({
  highlights,
  children,
}: {
  highlights: FTQCHighlightMap;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <FTQCHighlightContext.Provider value={highlights}>{children}</FTQCHighlightContext.Provider>
  );
}

/**
 * Hook to access FTQC highlight map from context.
 * Returns the highlight for a specific node ID.
 */
export function useFTQCHighlight(nodeId: string): FTQCHighlight | undefined {
  const highlights = useContext(FTQCHighlightContext);
  return highlights.get(nodeId);
}

/**
 * Hook to access the full FTQC highlight map from context.
 */
export function useFTQCHighlightMap(): FTQCHighlightMap {
  return useContext(FTQCHighlightContext);
}
