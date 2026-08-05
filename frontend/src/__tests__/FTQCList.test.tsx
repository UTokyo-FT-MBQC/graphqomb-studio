/** FTQC list display-mode controls. */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FTQCList } from "@/components/panels/NodeEdgeList/FTQCList";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";

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
    detectorDiagnostics: [
      { deterministic: true, mismatches: [] },
      {
        deterministic: false,
        mismatches: [
          {
            nodeId: "n1",
            stabilizerAxis: "X",
            detectorMeasurementAxis: "Y",
            configuredMeasurementAxis: "Y",
            measurementPlane: "XY",
            measurementAngleCoeff: 0.25,
            reason: "axis-mismatch",
          },
          {
            nodeId: "n3",
            stabilizerAxis: "Z",
            detectorMeasurementAxis: null,
            configuredMeasurementAxis: "X",
            measurementPlane: "XY",
            measurementAngleCoeff: 0,
            reason: "missing-measurement-support",
          },
          {
            nodeId: "n4",
            stabilizerAxis: "X",
            detectorMeasurementAxis: null,
            configuredMeasurementAxis: null,
            measurementPlane: "XY",
            measurementAngleCoeff: 0.125,
            reason: "non-pauli-measurement",
          },
        ],
      },
      { deterministic: true, mismatches: [] },
    ],
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

  it("shows the nodes whose detector support and measurement angle do not match", () => {
    useProjectStore.getState().updateFTQC({
      parityCheckGroup: [["n0"], ["n1"], ["n2"]],
      parityCheckTags: ["type=flag", "", "type=flag"],
      logicalObservableGroup: {},
    });
    useUIStore.getState().setShowParityGroups(true);
    render(<FTQCList />);

    expect(screen.getByText("1 non-deterministic")).toBeInTheDocument();
    expect(screen.getByText("Non-deterministic")).toBeInTheDocument();
    expect(screen.getByText("Support / measurement mismatch")).toBeInTheDocument();
    expect(screen.getByText("n1: required support X ≠ measurement Y")).toBeInTheDocument();
    expect(
      screen.getByText(
        "n3: required support Z, but node is not included in detector (node measurement: X)"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("n4: required support X, but node measurement is non-Pauli (XY, angle π/4)")
    ).toBeInTheDocument();
  });
});
