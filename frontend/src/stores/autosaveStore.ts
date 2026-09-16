import { create } from "zustand";

// Kept outside the persisted project so reporting a failure cannot trigger another write.
export const useAutosaveStore = create<{ paused: boolean }>(() => ({ paused: false }));
