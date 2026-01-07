# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Frontend

#### Added
- Bezier curve offset for overlapping edges to prevent visual overlap
- Edge utility module (`edgeUtils.ts`) with overlap detection and offset calculation

### Backend

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
