"use client";

import { GraphCanvas2D } from "@/components/canvas/GraphCanvas2D";
import { GraphCanvas3D } from "@/components/canvas/GraphCanvas3D";
import { Tiling3DDialog } from "@/components/dialogs/Tiling3DDialog";
import { PropertyPanel } from "@/components/panels/PropertyPanel";
import { ScheduleEditor } from "@/components/schedule";
import { TimelineView } from "@/components/timeline/TimelineView";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { useUIStore } from "@/stores/uiStore";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";

const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 560;
const DEFAULT_SIDEBAR_WIDTH = 320;
const SIDEBAR_KEYBOARD_STEP = 24;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function Home(): ReactNode {
  const viewMode = useUIStore((state) => state.viewMode);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);

  // Use 3D canvas only for 3D isometric view
  const show3DCanvas = viewMode === "3d-isometric";

  const handleSidebarResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startWidth = sidebarWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      function handlePointerMove(moveEvent: PointerEvent): void {
        const nextWidth = startWidth + startX - moveEvent.clientX;
        setSidebarWidth(clamp(nextWidth, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH));
      }

      function handlePointerUp(): void {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      }

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [sidebarWidth]
  );

  const handleSidebarResizeKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSidebarWidth((width) =>
        clamp(width + SIDEBAR_KEYBOARD_STEP, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH)
      );
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setSidebarWidth((width) =>
        clamp(width - SIDEBAR_KEYBOARD_STEP, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH)
      );
    }
  }, []);

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="min-w-0 flex-1 bg-gray-50">
          {show3DCanvas ? <GraphCanvas3D /> : <GraphCanvas2D />}
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize property panel"
          tabIndex={0}
          onPointerDown={handleSidebarResizeStart}
          onKeyDown={handleSidebarResizeKeyDown}
          className="w-3 shrink-0 cursor-col-resize border-x border-gray-200 bg-gray-100 transition-colors hover:bg-blue-200 focus:bg-blue-200 focus:outline-none"
        />

        {/* Property Panel */}
        <aside
          className="shrink-0 border-l border-gray-200 bg-white overflow-hidden"
          style={{ width: sidebarWidth }}
        >
          <PropertyPanel />
        </aside>
      </div>

      {/* Schedule Editor (expandable panel) */}
      <ScheduleEditor />

      {/* 3D Tiling Dialog (modal) */}
      <Tiling3DDialog />

      {/* Timeline */}
      <footer className="h-28 border-t border-gray-200 bg-white">
        <TimelineView />
      </footer>
    </main>
  );
}
