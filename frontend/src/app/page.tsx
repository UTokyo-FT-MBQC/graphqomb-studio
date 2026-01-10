"use client";

import { GraphCanvas2D } from "@/components/canvas/GraphCanvas2D";
import { GraphCanvas3D } from "@/components/canvas/GraphCanvas3D";
import { PropertyPanel } from "@/components/panels/PropertyPanel";
import { ScheduleEditor } from "@/components/schedule";
import { TimelineView } from "@/components/timeline/TimelineView";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { useUIStore } from "@/stores/uiStore";
import type { ReactNode } from "react";

export default function Home(): ReactNode {
  const viewMode = useUIStore((state) => state.viewMode);

  // Use 3D canvas only for 3D isometric view
  const show3DCanvas = viewMode === "3d-isometric";

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 bg-gray-50">
          {show3DCanvas ? <GraphCanvas3D /> : <GraphCanvas2D />}
        </div>

        {/* Property Panel */}
        <aside className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
          <PropertyPanel />
        </aside>
      </div>

      {/* Schedule Editor (expandable panel) */}
      <ScheduleEditor />

      {/* Timeline */}
      <footer className="h-28 border-t border-gray-200 bg-white">
        <TimelineView />
      </footer>
    </main>
  );
}
