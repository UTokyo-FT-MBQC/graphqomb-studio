"use client";

import { downloadProject } from "@/lib/validation";
import { useAutosaveStore } from "@/stores/autosaveStore";
import { useProjectStore } from "@/stores/projectStore";

export function AutosaveWarning(): React.ReactNode {
  const paused = useAutosaveStore((state) => state.paused);
  if (!paused) return null;

  return (
    <div
      role="alert"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
    >
      Autosave is paused because browser storage is full or unavailable. You can keep editing.
      Export before closing or reloading; otherwise these changes will be lost and an older saved
      project may reopen.
      <button
        type="button"
        className="ml-3 font-semibold underline"
        onClick={() => downloadProject(useProjectStore.getState().project)}
      >
        Export project
      </button>
    </div>
  );
}
