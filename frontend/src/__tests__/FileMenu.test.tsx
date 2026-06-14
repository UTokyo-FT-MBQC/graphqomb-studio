/**
 * FileMenu tests.
 */

import { FileMenu } from "@/components/toolbar/FileMenu";
import { useProjectStore } from "@/stores/projectStore";
import type { GraphQOMBProject } from "@/types";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockImportPtnProject = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  importPtnProject: mockImportPtnProject,
  isApiError: (error: unknown) =>
    typeof error === "object" && error !== null && "detail" in error && "status" in error,
}));

function importedProject(): GraphQOMBProject {
  return {
    $schema: "graphqomb-studio/v1",
    name: "sample",
    nodes: [
      {
        id: "n0",
        coordinate: { x: 0, y: 0, z: 0 },
        role: "input",
        measBasis: { type: "axis", axis: "X", sign: "PLUS" },
        qubitIndex: 0,
      },
      {
        id: "n1",
        coordinate: { x: 1, y: 0, z: 0 },
        role: "output",
        qubitIndex: 0,
      },
    ],
    edges: [{ id: "n0-n1", source: "n0", target: "n1" }],
    flow: { xflow: { n0: ["n1"] }, zflow: "auto" },
  };
}

describe("FileMenu", () => {
  beforeEach(() => {
    mockImportPtnProject.mockReset();
    useProjectStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
  });

  it("allows JSON and PTN files", () => {
    const { container } = render(
      <FileMenu onError={vi.fn()} onClearError={vi.fn()} onClearValidation={vi.fn()} />
    );

    const input = container.querySelector('input[type="file"]');
    expect(input).toHaveAttribute("accept", ".json,.ptn");
  });

  it("imports PTN files through the backend converter", async () => {
    mockImportPtnProject.mockResolvedValueOnce(importedProject());
    const { container } = render(
      <FileMenu onError={vi.fn()} onClearError={vi.fn()} onClearValidation={vi.fn()} />
    );
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInstanceOf(HTMLInputElement);

    const file = new File(["ptn text"], "sample.ptn", { type: "text/plain" });
    Object.defineProperty(file, "text", { value: async () => "ptn text" });
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    await waitFor(() => {
      expect(useProjectStore.getState().project.name).toBe("sample");
    });
    expect(mockImportPtnProject).toHaveBeenCalledWith("ptn text", "sample");
  });

  it("reports PTN import API errors", async () => {
    mockImportPtnProject.mockRejectedValueOnce({
      detail: "Invalid PTN file: Line 1: Unknown command",
      status: 400,
    });
    const onError = vi.fn();
    const { container } = render(
      <FileMenu onError={onError} onClearError={vi.fn()} onClearValidation={vi.fn()} />
    );
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInstanceOf(HTMLInputElement);

    const file = new File(["bad ptn"], "bad.ptn", { type: "text/plain" });
    Object.defineProperty(file, "text", { value: async () => "bad ptn" });
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        "Failed to import file: Invalid PTN file: Line 1: Unknown command"
      );
    });
  });
});
