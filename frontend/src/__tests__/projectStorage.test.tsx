import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutosaveWarning } from "@/components/AutosaveWarning";
import { serializeProject } from "@/lib/validation";
import { useAutosaveStore } from "@/stores/autosaveStore";
import { useProjectStore } from "@/stores/projectStore";

describe("best-effort project autosave", () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useProjectStore.getState().reset();
    localStorage.clear();
  });

  it("keeps imports and edits in memory and skips serialization after quota failure", () => {
    const saved = localStorage.getItem("graphqomb-project");
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    const project = { ...useProjectStore.getState().project, name: "Large project" };
    expect(() => useProjectStore.getState().setProject(project)).not.toThrow();
    expect(useProjectStore.getState().project).toBe(project);
    expect(useAutosaveStore.getState().paused).toBe(true);
    const stringify = vi.spyOn(JSON, "stringify");
    useProjectStore.getState().setProjectName("Edited large project");
    expect(stringify).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("graphqomb-project")).toBe(saved);
    expect(JSON.parse(serializeProject(useProjectStore.getState().project)).name).toBe(
      "Edited large project"
    );

    write.mockRestore();
    useProjectStore.getState().reset();
    expect(useAutosaveStore.getState().paused).toBe(false);
    expect(JSON.parse(localStorage.getItem("graphqomb-project") ?? "{}").state.project.name).toBe(
      "Untitled"
    );
  });

  it("handles unavailable browser storage", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });
    expect(() => useProjectStore.getState().setProjectName("Still editable")).not.toThrow();
    expect(useProjectStore.getState().project.name).toBe("Still editable");
    expect(useAutosaveStore.getState().paused).toBe(true);
  });

  it("warns about reload and exports the latest in-memory project", () => {
    const createObjectURL = vi.fn(() => "blob:project");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<AutosaveWarning />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    act(() => {
      useProjectStore.getState().setProjectName("Latest changes");
      useAutosaveStore.setState({ paused: true });
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Export before closing or reloading");
    fireEvent.click(screen.getByRole("button", { name: "Export project" }));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click.mock.instances[0]).toBeInstanceOf(HTMLAnchorElement);
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe("Latest_changes.json");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:project");
    expect(useAutosaveStore.getState().paused).toBe(true);
  });
});
