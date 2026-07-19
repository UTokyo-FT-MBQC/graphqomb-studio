/** Cached GraphQOMB closure results for the current FTQC definition. */

import type { FTQCDefinition } from "@/types";
import { create } from "zustand";

interface CompiledFTQCState {
  compiledFTQC: FTQCDefinition | null;
  sourceKey: string | null;
  isLoading: boolean;
  error: string | null;
  beginCompilation: (sourceKey: string) => boolean;
  setCompiledFTQC: (sourceKey: string, ftqc: FTQCDefinition) => void;
  setError: (sourceKey: string, error: string) => void;
  clear: () => void;
}

export const useCompiledFTQCStore = create<CompiledFTQCState>((set) => ({
  compiledFTQC: null,
  sourceKey: null,
  isLoading: false,
  error: null,

  beginCompilation: (sourceKey) => {
    let started = false;
    set((state) => {
      if (state.sourceKey === sourceKey && (state.isLoading || state.compiledFTQC !== null)) {
        return state;
      }
      started = true;
      return {
        compiledFTQC: null,
        sourceKey,
        isLoading: true,
        error: null,
      };
    });
    return started;
  },

  setCompiledFTQC: (sourceKey, ftqc) =>
    set((state) =>
      state.sourceKey === sourceKey
        ? { ...state, compiledFTQC: ftqc, isLoading: false, error: null }
        : state
    ),

  setError: (sourceKey, error) =>
    set((state) =>
      state.sourceKey === sourceKey
        ? { ...state, compiledFTQC: null, isLoading: false, error }
        : state
    ),

  clear: () => set({ compiledFTQC: null, sourceKey: null, isLoading: false, error: null }),
}));
