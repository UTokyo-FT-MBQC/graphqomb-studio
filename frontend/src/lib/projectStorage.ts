import type { PersistStorage } from "zustand/middleware";
import { useAutosaveStore } from "@/stores/autosaveStore";
import type { GraphQOMBProject } from "@/types";

export const projectStorage: PersistStorage<{ project: GraphQOMBProject }> = {
  getItem(name) {
    if (typeof window === "undefined") return null;
    try {
      const value = window.localStorage.getItem(name);
      return value === null ? null : JSON.parse(value);
    } catch {
      useAutosaveStore.setState({ paused: true });
      return null;
    }
  },
  setItem(name, value) {
    // Guard before serialization: large projects must remain editable after quota failure.
    if (typeof window === "undefined" || useAutosaveStore.getState().paused) return;
    try {
      window.localStorage.setItem(name, JSON.stringify(value));
    } catch {
      useAutosaveStore.setState({ paused: true });
    }
  },
  removeItem(name) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      useAutosaveStore.setState({ paused: true });
    }
  },
};
