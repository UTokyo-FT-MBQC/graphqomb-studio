/** FTQC list display-mode controls. */

import { FTQCList } from "@/components/panels/NodeEdgeList/FTQCList";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useFTQCVisualization", () => ({
  useFTQCVisualization: () => ({
    displayedFTQC: {
      parityCheckGroup: [["n0"], ["n1"], ["n2"]],
      parityCheckTags: ["type=flag", "", "type=flag"],
      logicalObservableGroup: {},
    },
    highlights: new Map(),
    hasData: true,
    parityGroupCount: 3,
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
    useUIStore.getState().setDetectorTypeFilter("non-flag");
    useUIStore.getState().setShowParityGroups(false);
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

  it("lists regular detectors by default and flags separately", () => {
    useProjectStore.getState().updateFTQC({
      parityCheckGroup: [["n0"], ["n1"], ["n2"]],
      parityCheckTags: ["type=flag", "", "type=flag"],
      logicalObservableGroup: {},
    });
    useUIStore.getState().setShowParityGroups(true);
    render(<FTQCList />);

    const detectorsButton = screen.getByRole("button", { name: "Detectors (1)" });
    const flagsButton = screen.getByRole("button", { name: "Flags (2)" });
    expect(detectorsButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: /Group 0/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Group 2/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Group 1/ })).toBeInTheDocument();

    fireEvent.click(flagsButton);

    expect(flagsButton).toHaveAttribute("aria-pressed", "true");
    expect(useUIStore.getState().ftqcVisualization.detectorTypeFilter).toBe("flag");
    expect(useUIStore.getState().ftqcVisualization.selectedParityGroupIndex).toBe(0);
    expect(screen.getByRole("button", { name: /Group 0/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Group 2/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Group 1/ })).not.toBeInTheDocument();
  });
});
