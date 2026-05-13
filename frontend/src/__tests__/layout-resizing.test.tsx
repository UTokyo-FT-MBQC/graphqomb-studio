/**
 * Layout resizing interaction tests.
 */

import Home from "@/app/page";
import { useProjectStore } from "@/stores/projectStore";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

function dispatchPointerDown(
  target: Element,
  coordinates: { clientX?: number; clientY?: number },
  pointerId = 1
): void {
  const event = new MouseEvent("pointerdown", { bubbles: true, ...coordinates });
  Object.defineProperty(event, "pointerId", { value: pointerId });
  fireEvent(target, event);
}

function dispatchPointerMove(coordinates: { clientX?: number; clientY?: number }): void {
  fireEvent(window, new MouseEvent("pointermove", coordinates));
}

function dispatchPointerUp(): void {
  fireEvent(window, new MouseEvent("pointerup"));
}

function dispatchPointerCancel(): void {
  fireEvent(window, new MouseEvent("pointercancel"));
}

vi.mock("@/components/canvas/GraphCanvas2D", () => ({
  GraphCanvas2D: () => <div data-testid="graph-canvas-2d" />,
}));

vi.mock("@/components/canvas/GraphCanvas3D", () => ({
  GraphCanvas3D: () => <div data-testid="graph-canvas-3d" />,
}));

vi.mock("@/components/dialogs/Tiling3DDialog", () => ({
  Tiling3DDialog: () => null,
}));

vi.mock("@/components/panels/PropertyPanel", async () => {
  const actual = await vi.importActual<typeof import("@/components/panels/PropertyPanel")>(
    "@/components/panels/PropertyPanel"
  );

  return {
    ...actual,
    PropertyPanel: vi.fn(() => <div data-testid="mock-property-panel" />),
  };
});

vi.mock("@/components/schedule", () => ({
  ScheduleEditor: () => null,
}));

vi.mock("@/components/timeline/TimelineView", () => ({
  TimelineView: () => null,
}));

vi.mock("@/components/toolbar/Toolbar", () => ({
  Toolbar: () => null,
}));

describe("layout resizing", () => {
  beforeAll(() => {
    Element.prototype.setPointerCapture ??= vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    useProjectStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });

  it("clamps property panel pointer resizing and restores body drag styles", async () => {
    render(<Home />);

    const separator = screen.getByRole("separator", { name: "Resize property panel" });
    const panel = screen.getByTestId("mock-property-panel").parentElement as HTMLElement;

    dispatchPointerDown(separator, { clientX: 400 });
    expect(document.body.style.cursor).toBe("col-resize");
    expect(document.body.style.userSelect).toBe("none");

    dispatchPointerMove({ clientX: 0 });

    await waitFor(() => {
      expect(panel).toHaveStyle({ width: "560px" });
    });

    dispatchPointerUp();
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");

    dispatchPointerDown(separator, { clientX: 400 }, 2);
    dispatchPointerMove({ clientX: 1000 });

    await waitFor(() => {
      expect(panel).toHaveStyle({ width: "280px" });
    });

    dispatchPointerCancel();
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
  });

  it("clamps property panel keyboard resizing", async () => {
    render(<Home />);

    const separator = screen.getByRole("separator", { name: "Resize property panel" });
    const panel = screen.getByTestId("mock-property-panel").parentElement as HTMLElement;

    for (let i = 0; i < 20; i++) {
      fireEvent.keyDown(separator, { key: "ArrowLeft" });
    }

    await waitFor(() => {
      expect(panel).toHaveStyle({ width: "560px" });
    });

    for (let i = 0; i < 20; i++) {
      fireEvent.keyDown(separator, { key: "ArrowRight" });
    }

    await waitFor(() => {
      expect(panel).toHaveStyle({ width: "280px" });
    });
  });
});

describe("PropertyPanel elements resizing", () => {
  let originalClientHeight: PropertyDescriptor | undefined;

  beforeAll(() => {
    Element.prototype.setPointerCapture ??= vi.fn();
    originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");
  });

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return 420;
      },
    });
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    useProjectStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    if (originalClientHeight !== undefined) {
      Object.defineProperty(HTMLElement.prototype, "clientHeight", originalClientHeight);
    } else {
      Object.defineProperty(HTMLElement.prototype, "clientHeight", {
        configurable: true,
        value: undefined,
      });
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });

  it("clamps elements list resizing to preserve details space", async () => {
    const { PropertyPanel: ActualPropertyPanel } = await vi.importActual<
      typeof import("@/components/panels/PropertyPanel")
    >("@/components/panels/PropertyPanel");

    render(<ActualPropertyPanel />);

    const separator = screen.getByRole("separator", { name: "Resize elements list" });
    const elementsPanel = screen.getByRole("button", { name: /Elements/ }).parentElement
      ?.parentElement as HTMLElement;

    dispatchPointerDown(separator, { clientY: 200 });
    expect(document.body.style.cursor).toBe("row-resize");
    expect(document.body.style.userSelect).toBe("none");

    dispatchPointerMove({ clientY: 700 });

    await waitFor(() => {
      expect(elementsPanel).toHaveStyle({ height: "240px" });
    });

    dispatchPointerMove({ clientY: 0 });

    await waitFor(() => {
      expect(elementsPanel).toHaveStyle({ height: "180px" });
    });

    dispatchPointerUp();
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
  });

  it("hides the elements resize separator when the list is collapsed", async () => {
    const { PropertyPanel: ActualPropertyPanel } = await vi.importActual<
      typeof import("@/components/panels/PropertyPanel")
    >("@/components/panels/PropertyPanel");

    render(<ActualPropertyPanel />);

    fireEvent.click(screen.getByRole("button", { name: /Elements/ }));

    expect(screen.queryByRole("separator", { name: "Resize elements list" })).toBeNull();
    expect(screen.getByRole("button", { name: /Elements/ }).parentElement).not.toHaveStyle({
      height: "300px",
    });
  });
});
