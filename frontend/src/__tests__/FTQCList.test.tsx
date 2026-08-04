/** FTQC list display-mode controls. */

import { FTQCList } from "@/components/panels/NodeEdgeList/FTQCList";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useFTQCVisualization", () => ({
  useFTQCVisualization: () => ({
    displayedFTQC: {
      parityCheckGroup: [["n0"]],
      parityCheckTags: ["type=flag"],
      logicalObservableGroup: {},
    },
    highlights: new Map(),
    hasData: true,
    parityGroupCount: 1,
    observableKeys: [],
    isCompiling: false,
    compilationError: null,
  }),
}));

describe("FTQCList", () => {
  afterEach(() => {
    cleanup();
    useProjectStore.getState().reset();
    useUIStore.getState().setFTQCDisplayMode("original");
    useUIStore.getState().setDetectorTypeFilter("all");
  });

  it("allows switching from original to compiled FTQC data", () => {
    useProjectStore.getState().updateFTQC({
      parityCheckGroup: [["n0"]],
      logicalObservableGroup: {},
    });
    render(<FTQCList />);

    const compiledButton = screen.getByRole("button", { name: /compiled/i });
    expect(compiledButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(compiledButton);

    expect(compiledButton).toHaveAttribute("aria-pressed", "true");
    expect(useUIStore.getState().ftqcVisualization.displayMode).toBe("compiled");
  });

  it("allows filtering highlights to flag or non-flag detectors", () => {
    useProjectStore.getState().updateFTQC({
      parityCheckGroup: [["n0"]],
      parityCheckTags: ["type=flag"],
      logicalObservableGroup: {},
    });
    useUIStore.getState().setShowParityGroups(true);
    render(<FTQCList />);

    const flagsButton = screen.getByRole("button", { name: "Flags" });
    expect(flagsButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(flagsButton);

    expect(flagsButton).toHaveAttribute("aria-pressed", "true");
    expect(useUIStore.getState().ftqcVisualization.detectorTypeFilter).toBe("flag");
    expect(screen.getByText("Flag")).toBeInTheDocument();
  });
});
