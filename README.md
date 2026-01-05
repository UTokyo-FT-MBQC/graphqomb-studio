# GraphQOMB Studio

A web application for visually editing Graph, Flow, and Schedule for Measurement-Based Quantum Computing (MBQC).

## Features

- **Graph Editor**: Create and edit MBQC resource graphs with an intuitive 2D canvas
- **Node Management**: Define input, output, and intermediate nodes with qubit indices
- **Edge Connections**: Connect nodes to build quantum graph states
- **Measurement Basis Editor**: Configure measurement basis (Planner/Axis mode) for each node
- **Flow Editor**: Configure X-flow targets and Z-flow mode (Auto/Manual) per node
- **Flow Visualization**: Toggle X-flow (red) and Z-flow (blue) arrows on the canvas
- **Import/Export**: Save and load projects in JSON format
- **Backend Validation**: Validate graph structure and flow definitions via API
- **Auto Z-Flow Computation**: Compute Z-flow from X-flow using odd_neighbors algorithm
- **Schedule Computation**: Compute measurement schedules using constraint solver
- **Schedule Visualization**: View computed measurement schedules in a timeline
- **3D Support**: Z-slice editing for 3D graphs with ghost node preview
- **3D Isometric View**: Full 3D visualization using Three.js with orbit controls

## Usage

### Creating a Graph

1. **Add Nodes**: Double-click on the canvas to create a new node
2. **Connect Nodes**: Drag from a node's handle to another node to create an edge
3. **Select Elements**: Click on a node or edge to select it
4. **Delete Elements**: Select a node/edge and press `Delete` or `Backspace`
5. **Pan Canvas**: Click and drag on the background
6. **Zoom**: Use mouse wheel to zoom in/out

### Node Configuration

Select a node to open the Property Panel on the right side:

- **Role**: Set as Input, Output, or Intermediate
- **Qubit Index**: Assign qubit indices for input/output nodes
- **Measurement Basis**:
  - *Planner Mode*: Select plane (XY, YZ, XZ) and angle coefficient
  - *Axis Mode*: Select axis (X, Y, Z) and sign (PLUS, MINUS)

### Flow Configuration

In the Property Panel, configure classical feedforward:

- **X-Flow**: Select target nodes for X corrections
- **Z-Flow Mode**:
  - *Auto*: Automatically computed using odd_neighbors algorithm
  - *Manual*: Manually select Z correction targets

### Flow Visualization

Use the toolbar checkboxes to toggle flow arrows:

- **X-Flow**: Red arrows showing X correction dependencies
- **Z-Flow**: Blue arrows showing Z correction dependencies

### 3D Graphs

For 3D projects (dimension = 3):

1. **2D Slice Mode** (default):
   - Use the Z-slider to navigate between Z levels
   - Ghost nodes show adjacent Z-level nodes (semi-transparent)
   - Cross-Z edges appear as dashed lines
   - New nodes are created at the current Z level

2. **3D Isometric View**:
   - Click "3D View" button to switch to 3D visualization
   - Rotate: Left-click and drag
   - Pan: Right-click and drag
   - Zoom: Mouse wheel

### Validation & Scheduling

1. **Validate**: Click "Validate" to check graph structure and flow definitions
2. **Schedule**: Click "Schedule" to compute measurement order
3. **Timeline**: View the computed schedule in the timeline panel at the bottom

### Import/Export

- **Export**: Click "Export" to download the project as JSON
- **Import**: Click "Import" to load a previously saved project

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript 5.7+ (strict mode)
- Tailwind CSS 3.4
- React Flow (graph visualization)
- Zustand (state management)
- Zod (validation)
- Three.js + React Three Fiber (3D visualization)

### Backend
- FastAPI
- Python 3.12+
- graphqomb library

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- Python 3.12+
- uv (Python package manager)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone git@github.com:UTokyo-FT-MBQC/graphqomb-studio.git
   cd graphqomb-studio
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   pnpm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   uv sync
   ```

4. **Start development servers**
   ```bash
   # Using Docker Compose (recommended)
   docker-compose up

   # Or manually:
   # Terminal 1 - Frontend
   cd frontend && pnpm dev

   # Terminal 2 - Backend
   cd backend && uv run uvicorn src.main:app --reload
   ```

5. **Open the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## Project Structure

```
graphqomb-studio/
├── frontend/           # Next.js frontend application
│   ├── src/
│   │   ├── app/        # App Router pages
│   │   ├── components/ # React components
│   │   ├── stores/     # Zustand state stores
│   │   ├── hooks/      # Custom React hooks
│   │   ├── lib/        # Utility functions
│   │   ├── types/      # TypeScript type definitions
│   │   └── schemas/    # Zod validation schemas
│   └── ...
├── backend/            # FastAPI backend application
│   ├── src/
│   │   ├── routers/    # API route handlers
│   │   ├── services/   # Business logic
│   │   └── models/     # Pydantic DTOs
│   └── ...
└── ...
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/validate` | Validate graph and flow definitions |
| POST | `/api/schedule` | Compute measurement schedule |
| POST | `/api/compute-zflow` | Auto-compute Z-flow from X-flow |

## License

MIT
