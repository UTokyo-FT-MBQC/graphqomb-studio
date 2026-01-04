"use client";

import { GraphCanvas2D } from "@/components/canvas/GraphCanvas2D";
import { PropertyPanel } from "@/components/panels/PropertyPanel";
import { Toolbar } from "@/components/toolbar/Toolbar";
import type { ReactNode } from "react";

export default function Home(): ReactNode {
  return (
    <main className="flex h-screen flex-col overflow-hidden">
      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 bg-gray-50">
          <GraphCanvas2D />
        </div>

        {/* Property Panel */}
        <aside className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
          <PropertyPanel />
        </aside>
      </div>

      {/* Timeline placeholder (Phase 3) */}
      <footer className="border-t border-gray-200 bg-white px-4 py-2">
        <p className="text-xs text-gray-400">Timeline (Schedule visualization - Phase 3)</p>
      </footer>
    </main>
  );
}
