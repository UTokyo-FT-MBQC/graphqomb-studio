# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Frontend

#### Added

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

- Node/Edge list panel in the property panel sidebar
  - Collapsible panel with tab switching (Nodes/Edges)
  - Filtering by ID, role (nodes), source/target (edges)
  - Sorting by various fields (ID, role, coordinates for nodes; ID, source, target for edges)
  - Click-to-select synchronization with canvas
- Bezier curve offset for overlapping edges to prevent visual overlap
- Edge utility module (`edgeUtils.ts`) with overlap detection and offset calculation

#### Fixed
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
