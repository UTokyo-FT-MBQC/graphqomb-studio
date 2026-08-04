/**
 * View control regression tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ViewControls } from "@/components/toolbar/ViewControls";
import { useUIStore } from "@/stores/uiStore";

describe("ViewControls", () => {
  beforeEach(() => {
    useUIStore.setState({ showIORoleColors: true });
  });

  it("toggles input/output role coloring", () => {
    render(<ViewControls />);

    const checkbox = screen.getByRole("checkbox", { name: "I/O Colors" });
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(useUIStore.getState().showIORoleColors).toBe(false);
  });
});
