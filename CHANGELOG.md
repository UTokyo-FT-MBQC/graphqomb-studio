# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

#### 3D Graph Editing Support

- **Cross-Z Edge Creation**
  - Added `edgeCreationStore` for managing edge creation mode state
  - Added `EdgeCreationToolbar` component for toggling edge creation mode
  - Enhanced `GhostNode` component with visual feedback during edge creation mode
  - Modified `GraphCanvas2D` to support edge creation via ghost nodes (drag connection)
  - Added sequential node selection mode to create edges across Z layers

- **3D View Direct Editing**
  - Extended `uiStore` with working plane configuration (XY/XZ/YZ plane selection, offset, grid visibility)
  - Added `WorkingPlaneGrid` component for 3D editing reference grid
  - Added `WorkingPlaneControls` toolbar component for 3D editing configuration
  - Added `useWorkingPlane` hook for coordinate conversion between Three.js and graph space
  - Enhanced `GraphCanvas3D` with node creation on working plane click
  - Added edge creation mode support in 3D view

### Changed

- `GraphCanvas2D.tsx`: Updated `handleConnect` to verify nodes exist in project (supports ghost node connections)
- `GraphCanvas3D.tsx`: Added working plane grid, node click handling for edge creation mode
- `GhostNode.tsx`: Added edge creation mode visual feedback (enhanced opacity, cursor, ring highlight)
- `Toolbar.tsx`: Integrated EdgeCreationToolbar and WorkingPlaneControls

### Technical Details

**New Files:**
- `frontend/src/stores/edgeCreationStore.ts`
- `frontend/src/components/toolbar/EdgeCreationToolbar.tsx`
- `frontend/src/components/toolbar/WorkingPlaneControls.tsx`
- `frontend/src/components/canvas/WorkingPlaneGrid.tsx`
- `frontend/src/hooks/useWorkingPlane.ts`

**Modified Files:**
- `frontend/src/stores/uiStore.ts`
- `frontend/src/components/canvas/GraphCanvas2D.tsx`
- `frontend/src/components/canvas/GraphCanvas3D.tsx`
- `frontend/src/components/canvas/GhostNode.tsx`
- `frontend/src/components/toolbar/Toolbar.tsx`
