# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.3.0] - 2026-02-03

### Frontend

#### Added

- **3D Flow Visualization**
  - X-Flow (red) and Z-Flow (blue) arrows now displayed in 3D viewer
  - Dashed lines with cone arrowheads matching 2D viewer style
  - Self-loop arrows for nodes that flow to themselves (elliptical loop above node)
  - Respects showXFlow/showZFlow toggles from uiStore
  - Supports "auto" Z-Flow mode with resolved flow from backend
  - New `FlowOverlay3D` component integrated into `GraphCanvas3D`
- **FTQC Configuration Editor**
  - New `FTQCDefinition` type for fault-tolerant quantum computing configuration
  - `parityCheckGroup`: List of node ID groups for parity check (error detection)
  - `logicalObservableGroup`: Mapping of observable index to target node IDs
  - FTQC button in toolbar opens modal dialog for editing FTQC configuration
  - `FTQCModal` component with full CRUD operations for parity check groups and logical observables
  - `useFTQCOperations` hook encapsulating FTQC editing logic
  - FTQC data included in JSON export/import
  - Node deletion automatically removes node references from FTQC configuration
  - UI state management for modal in `uiStore`
- **FTQC Group Visualization**
  - Parity Check Groups and Logical Observables can be visualized on the canvas with colored highlights
  - New "FTQC" tab in Node/Edge List panel showing all groups with node ID previews
  - `FTQCList` component displays groups with click-to-select for filtering
  - Parity Groups use warm colors (orange, amber, yellow, lime, cyan)
  - Logical Observables use cool colors (purple, pink, indigo, violet, fuchsia)
  - Click group to filter visualization, "Show All" button to reset filter
  - Node IDs displayed as preview text under each group name
  - 2D canvas: Glow effect (box-shadow) for highlighted nodes
  - 3D canvas: Emissive effect for highlighted nodes
  - New `useFTQCVisualization` hook computes node highlights based on UI state and FTQC data
  - New `ftqcColors.ts` utility with color palette definitions and helper functions
  - Extended `uiStore` with `ftqcVisualization` state (showParityGroups, selectedParityGroupIndex, showLogicalObservables, selectedObservableKey)
  - Highlight priority: FTQC highlight (lowest) < Selection < Edge Source < Schedule highlight (highest)
  - New `FTQCHighlightContext` for efficient highlight map sharing (O(1) per-node lookup instead of O(N) recomputation)

#### Fixed

- **FTQC Visualization**
  - Fixed stale group selection after deletion/reordering (selection auto-resets when index becomes invalid)
  - Fixed O(N²) performance issue where FTQC highlights were recomputed per-node; now computed once at canvas level
- **2D Viewer Node Styling Enhancement**
  - Redesigned 2D nodes to match 3D viewer's sphere-like appearance
  - Radial gradient backgrounds simulating 3D lighting/shading
  - Saturated role-based colors (green-500, blue-500, gray-500) instead of pale backgrounds
  - Emissive-like glow effects for selection states (white glow when selected, purple for edge source)
  - Node labels repositioned above nodes (matching 3D viewer layout)
  - Scale animation on edge creation source node (1.2x scale)
  - Updated `GhostNode` with matching sphere styling (lighter colors, dashed border)
  - Drop shadow effects for depth perception

- **3D Viewer Editing Enhancements**
  - Node drag movement in 3D edit mode (drag nodes on the working plane)
  - Keyboard deletion support (Backspace/Delete keys) for selected nodes/edges
  - Visual feedback during drag (orange emissive glow, larger node size)
  - OrbitControls automatically disabled during node dragging
  - Grid snapping for moved nodes (integer coordinates)

- **Toolbar Two-Row Layout Reorganization**
  - Reorganized toolbar into two-row layout for better organization
  - Top row: Project info (title, name), File menu, Validate/Schedule actions, node/edge count
  - Bottom row: View controls, edit tools (Add Node, Edge, Tiling), view-specific controls (Z-Slice, 3D Edit)
  - New `DropdownMenu` component (`components/ui/DropdownMenu.tsx`) with accessibility support (keyboard navigation, ARIA attributes)
  - New `FileMenu` component consolidating New/Import/Export into dropdown menu
  - New `ToolbarRow`, `ToolbarDivider`, `ToolbarSpacer` utility components

- **Node Label Display Toggle**
  - Added `showNodeLabels` state to `uiStore` with toggle action
  - "Labels" checkbox in ViewControls toolbar to show/hide node labels
  - `CustomNode`, `GhostNode`, and `GraphCanvas3D` components respect the toggle
  - Tooltip (title attribute) shows node ID on hover when labels are hidden

- **Tiling Feature (2D Canvas)**
  - New `types/tiling.ts` with TypeScript types and Zod schema for pattern validation
  - JSON-based pattern definition with 6 presets: square-lattice, brickwork, triangular, honeycomb (2D), cubic, rhg (3D)
  - `lib/tiling/generator.ts` for node/edge generation with coordinate-based IDs (`x_y_z` format, e.g., "0_0_0", "1.5_0_0")
  - `lib/tiling/validation.ts` with validation helpers for pattern dimension and node count limits
  - `tilingStore` for tiling state management (pattern selection, drag state, preview graph)
  - `TilingToolbar` component with pattern dropdown, Apply/Cancel buttons, and preview info display
  - `useTilingDrag` hook for 2D canvas drag-to-select range interaction
  - `TilingPreview2D` component for semi-transparent SVG overlay showing preview nodes/edges
  - Integrated tiling mode into `GraphCanvas2D` with real-time preview during drag
  - Added `isTilingMode` state to `uiStore` for mode switching
  - Edge generation with duplicate elimination and boundary clipping
  - Performance protection with max 1000 nodes limit and real-time count estimation
  - 2D patterns respect current Z slice when placing nodes (baseZ support)
  - Duplicate node/edge detection when applying overlapping tiling regions

- **3D Tiling Feature**
  - New `types/rhg.ts` with RHG lattice type definitions (RHGNode, RHGEdge, RHGLattice, Tiling3DParams)
  - `lib/tiling/rhg-generator.ts` with RHG lattice and 3D cubic grid generators
  - RHG (Raussendorf-Harrington-Goyal) lattice for fault-tolerant MBQC using parity-based rotated surface code layout
  - Parity-based node placement with XXZZ boundary conditions (6 allowed parities out of 8)
  - Node roles: data qubits (4 parities), ancilla_x_check (parity 0,1,0), ancilla_z_check (parity 1,0,1)
  - Edge connectivity based on Manhattan distance = 1 between allowed parity nodes
  - RHG parameters: dx (distance X), dy (distance Y), rounds (error correction rounds)
  - Physical dimensions: Lx = 2*dx - 1, Ly = 2*dy - 1, Lz = 2*rounds + 1
  - Simple 3D cubic grid generator with nodes at vertices connected to 6 neighbors
  - Node/edge count estimation functions for preview display
  - `Tiling3DDialog` component for dialog-based 3D pattern configuration
  - Pattern selection with pattern-specific inputs: Cubic (Lx, Ly, Lz) or RHG (dx, dy, rounds)
  - Physical size display for RHG patterns showing computed Lx x Ly x Lz dimensions
  - Origin offset support for positioning generated structures
  - Real-time node/edge count estimation with performance limit warnings
  - Extended `tilingStore` with 3D tiling state (params3D, preview3D, generatePreview3D, applyTiling3D)
  - Extended `uiStore` with 3D tiling dialog state (is3DTilingDialogOpen, open3DTilingDialog, close3DTilingDialog)
  - "3D Tiling" button in toolbar to open configuration dialog

- **Manual Schedule Editor (Phase 1)** (#9)
  - New `scheduleEditorStore` for managing draft schedule state with lock/unlock functionality
  - Expandable `ScheduleEditor` panel between canvas and timeline footer
  - `ScheduleToolbar` with mode selector (Manual/Auto/Hybrid), Auto-fill, Clear, and Apply buttons
  - `ScheduleTable` and `ScheduleTableRow` for table-based time input (prepareTime, measureTime per node)
  - `MiniTimelineBar` component for visual timeline representation in table rows
  - Lock/unlock functionality to protect specific node schedules during Auto-fill
  - Bidirectional selection sync: click node in canvas → select row in table, click row → select node
  - Hover highlight: hover row in table → highlight node in canvas (2D Projection only)
  - Apply button to commit draft schedule to project and update TimelineView
  - Warning banner when editing in non-2D-projection view modes

- **Entangle Time Editing**
  - Extended `scheduleEditorStore` with `DraftEdgeEntry` for edge-based entangle time management
  - Tab-based UI in Schedule Editor: Nodes tab for prepareTime/measureTime, Edges tab for entangleTime
  - `EdgeScheduleTable` and `EdgeScheduleTableRow` components for edge scheduling
  - Lock/unlock functionality for individual edges
  - "Auto-fill Edges" button to compute entangle times from node prepare times: `max(prep[source], prep[target])`
  - Bidirectional edge selection sync: click edge in canvas → select row in table, click row → highlight edge
  - Edge highlight in 2D Projection view when hovered/selected in schedule editor (orange color)
  - `CustomEdge` component updated with schedule editor highlight integration

- **Schedule Validation**
  - New `/api/validate-schedule` endpoint validates manual schedules against MBQC constraints
  - Validates: node set correctness, schedule completeness, DAG dependencies, entanglement causality, time ordering
  - Error messages translated from graphqomb indices to frontend node IDs for clarity
  - "Validate" button in Schedule Editor toolbar
  - Validation state in `scheduleEditorStore` with auto-clear on schedule changes
  - Green "Schedule Valid" indicator on successful validation

- **Unified 3D Coordinate System**
  - All coordinates are now 3D (x, y, z) regardless of view mode
  - Fractional Z values are now supported (e.g., z=0.5)
  - Three view modes: XY Projection (show all nodes), Z Slice (filter by Z), 3D View (isometric)
  - Ghost nodes now appear when |Z diff| < 1 (previously required exact Z ±1)
  - New nodes in XY Projection mode default to z=0
  - Z coordinate input is always visible in NodeProperties panel
  - Z sort option is always available in NodeList panel

- **3D Graph Editing Support**
  - Added 2D/3D dimension toggle in `ViewControls` toolbar component
  - Cross-Z edge creation mode with `edgeCreationStore` and `EdgeCreationToolbar`
  - Enhanced `GhostNode` component with visual feedback during edge creation mode
  - Sequential node selection mode to create edges across Z layers
  - Extended `uiStore` with working plane configuration (XY/XZ/YZ plane selection, offset, grid visibility)
  - `WorkingPlaneGrid` component for 3D editing reference grid
  - `WorkingPlaneControls` toolbar component for 3D editing configuration
  - `useWorkingPlane` hook for coordinate conversion between Three.js and graph space
  - Node creation on working plane click in `GraphCanvas3D`
  - Edge creation mode support in 3D view

- **Node Creation Toolbar**
  - `NodeCreationToolbar` component for creating nodes with manual X, Y, Z coordinate input
  - Located next to Edge Creation button in toolbar

- **Configurable Ghost Node Range**
  - `GhostRangeSlider` component for adjusting ghost node visibility threshold
  - Ghost nodes now visible when |Z diff| <= range (default: 1, previously < 1)
  - User can adjust range from 0 to 5 via slider or direct input

- Node/Edge list panel in the property panel sidebar
  - Collapsible panel with tab switching (Nodes/Edges)
  - Filtering by ID, role (nodes), source/target (edges)
  - Sorting by various fields (ID, role, coordinates for nodes; ID, source, target for edges)
  - Click-to-select synchronization with canvas
- Bezier curve offset for overlapping edges to prevent visual overlap
- Edge utility module (`edgeUtils.ts`) with overlap detection and offset calculation

#### Fixed
- `scheduleEditorStore.ts`: Fixed `autoFillEdges` incorrectly handling input nodes. Added `inputNodeIds` to `DraftSchedule` to properly distinguish input nodes (always ready at time -1) from unscheduled intermediate nodes (skipped until scheduled). Previously, input nodes with null `prepareTime` in entries were incorrectly skipped by Auto-fill Edges.
- `GraphCanvas2D.tsx`: Fixed double-click node creation not working by adding `zoomOnDoubleClick={false}` to ReactFlow component (React Flow v12 captures double-click for zoom by default)
- `WorkingPlaneGrid.tsx`: Fixed XY/XZ plane rotation mapping - XY plane (Graph Z fixed) now correctly uses no rotation, and XZ plane (Graph Y fixed) correctly uses -90° X rotation
- Z-flow auto-computation now works properly (useResolvedFlow hook was not being called)
- Self-loop arrows in flow visualization now render as visible curved loops instead of invisible points
- `WorkingPlaneControls`: Working plane offset slider now uses axis-specific ranges (X range for YZ plane, Y range for XZ plane, Z range for XY plane) instead of always using Z range. This fixes an issue where the slider was disabled for 2D-origin graphs with all Z=0 when using XZ or YZ planes.

#### Changed
- `GraphCanvas2D.tsx`: Updated `handleConnect` to verify nodes exist in project (supports ghost node connections)
- `GraphCanvas3D.tsx`: Added working plane grid, node click handling for edge creation mode
- `GhostNode.tsx`: Added edge creation mode visual feedback (enhanced opacity, cursor, ring highlight)
- `Toolbar.tsx`: Integrated NodeCreationToolbar, EdgeCreationToolbar, and WorkingPlaneControls
- `ViewControls.tsx`: Replaced 2D/3D toggle with 3-button view mode selector (XY Projection, Z Slice, 3D View)
- `types/index.ts`: Unified coordinate type to single 3D Coordinate interface
- `schemas/project.ts`: Simplified to single CoordinateSchema (removed 2D variant)
- `projectStore.ts`: Removed dimension property and setDimension action
- `uiStore.ts`: ViewMode now includes "2d-projection" as default
- `geometry.ts`: Ghost node logic changed from exact Z ±1 to distance-based |Z diff| < 1

#### Removed
- `dimension` property from project (all coordinates are now 3D)
- `Coordinate2D` type and `is3D()` type guard function
- 2D/3D dimension toggle (replaced with view mode selector)

### Backend

#### Added
- `FTQCDefinitionDTO` for FTQC configuration (parity check groups and logical observables)
- Optional `ftqc` field in `ProjectPayloadDTO` for FTQC data

#### Changed
- `dto.py`: Removed `Coordinate2D` class and `dimension` field from `ProjectPayloadDTO`
- `converter.py`: Simplified coordinate conversion (always 3D)
- All test fixtures updated to use 3D coordinates

### Breaking Changes
- Project files must now use 3D coordinates `{x, y, z}` for all nodes
- API requests no longer include `dimension` field in project payload
- Existing 2D project files are not automatically migrated

---

## [Frontend v0.1.0] - 2026-01-07

Initial release of GraphQOMB Studio frontend.

### Added
- Graph Editor with React Flow integration
- Node management (input, output, intermediate nodes with qubit indices)
- Edge connections for building quantum graph states
- Measurement basis editor (Planner mode: plane + angle, Axis mode: axis + sign)
- X-flow editor with target node selection
- Z-flow editor (Auto mode using odd_neighbors, Manual mode)
- Flow visualization overlays (X-flow: red arrows, Z-flow: blue arrows)
- Import/Export functionality (JSON format)
- Schedule visualization timeline
- 3D support with Z-slice editing and ghost node preview
- 3D isometric view with Three.js and orbit controls

### Fixed
- Reset loading state after zflow computation
- React 19 compatibility with updated react-three packages

## [Backend v0.1.0] - 2026-01-07

Initial release of GraphQOMB Studio backend.

### Added
- FastAPI-based REST API
- Health check endpoint (`GET /health`)
- Graph validation endpoint (`POST /api/validate`)
- Schedule computation endpoint (`POST /api/schedule`)
- Z-flow auto-computation endpoint (`POST /api/compute-zflow`)
- Integration with graphqomb library for MBQC operations
