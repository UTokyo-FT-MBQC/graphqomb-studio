/**
 * Resolved Flow Store
 *
 * State store for cached resolved flow data.
 * Used when zflow="auto" is resolved by backend API.
 * Phase 3 will implement the actual API integration.
 */

import type { ResolvedFlow } from "@/types";
import { create } from "zustand";

interface ResolvedFlowState {
  resolvedFlow: ResolvedFlow | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setResolvedFlow: (flow: ResolvedFlow) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useResolvedFlowStore = create<ResolvedFlowState>((set) => ({
  resolvedFlow: null,
  isLoading: false,
  error: null,

  setResolvedFlow: (flow) => set({ resolvedFlow: flow, isLoading: false, error: null }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false }),

  clear: () => set({ resolvedFlow: null, isLoading: false, error: null }),
}));
