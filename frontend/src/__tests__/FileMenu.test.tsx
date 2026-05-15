import { FileMenu } from "@/components/toolbar/FileMenu";
import { exportPtn, importPtn } from "@/lib/api";
import { downloadText } from "@/lib/validation";
import { useProjectStore } from "@/stores/projectStore";
import type { GraphQOMBProject } from "@/types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  exportPtn: vi.fn(),
  importPtn: vi.fn(),
  isApiError: vi.fn(() => false),
}));

vi.mock("@/lib/validation", async () => {
  const actual = await vi.importActual<typeof import("@/lib/validation")>("@/lib/validation");
  return {
    ...actual,
    downloadProject: vi.fn(),
    downloadText: vi.fn(),
  };
});

const emptyProject: GraphQOMBProject = {
  $schema: "graphqomb-studio/v1",
  name: "Test Project",
  nodes: [],
  edges: [],
  flow: { xflow: {}, zflow: "auto" },
};

function renderFileMenu() {
  return render(<FileMenu onError={vi.fn()} onClearError={vi.fn()} onClearValidation={vi.fn()} />);
}

describe("FileMenu PTN actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.getState().setProject(emptyProject);
  });

  it("exports PTN through the backend", async () => {
    vi.mocked(exportPtn).mockResolvedValue(".version 1\n");

    renderFileMenu();

    fireEvent.click(screen.getByRole("button", { name: /file/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Export PTN" }));

    await waitFor(() => expect(exportPtn).toHaveBeenCalledWith(emptyProject));
    expect(downloadText).toHaveBeenCalledWith(".version 1\n", "Test_Project.ptn", "text/plain");
  });

  it("imports PTN through the backend", async () => {
    const importedProject: GraphQOMBProject = {
      ...emptyProject,
      name: "example",
    };
    vi.mocked(importPtn).mockResolvedValue(importedProject);
    const { container } = renderFileMenu();
    const input = container.querySelector("input[type='file']");
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("File input was not rendered");
    }

    const file = new File([".version 1\n"], "example.ptn", { type: "text/plain" });
    Object.defineProperty(file, "text", {
      value: vi.fn().mockResolvedValue(".version 1\n"),
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(importPtn).toHaveBeenCalledWith(".version 1\n", "example"));
    expect(useProjectStore.getState().project.name).toBe("example");
  });
});
