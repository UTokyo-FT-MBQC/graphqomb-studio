# GraphQOMB Studio

A web application for visually editing Graph, Flow, and Schedule for Measurement-Based Quantum Computing (MBQC).

## Features

### Implemented
- **Graph Editor**: Create and edit MBQC resource graphs with an intuitive 2D canvas
- **Node Management**: Define input, output, and intermediate nodes with qubit indices
- **Edge Connections**: Connect nodes to build quantum graph states
- **Measurement Basis Editor**: Configure measurement basis (Planner/Axis mode) for each node
- **Flow Editor**: Configure X-flow targets and Z-flow mode (Auto/Manual) per node
- **Flow Visualization**: Toggle X-flow (red) and Z-flow (blue) arrows on the canvas
- **Import/Export**: Save and load projects in JSON format

### Planned (Phase 3+)
- **Backend Validation**: Validate graph structure and flow definitions via API
- **Schedule Computation**: Compute measurement schedules using constraint solver
- **Schedule Visualization**: View computed measurement schedules in a timeline
- **3D Support**: Z-slice editing and isometric 3D view

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript 5.7+ (strict mode)
- Tailwind CSS 3.4
- React Flow (graph visualization)
- Zustand (state management)
- Zod (validation)
- Three.js + React Three Fiber (3D visualization - Phase 4)

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

## API Endpoints (Phase 3 - Planned)

The following API endpoints are planned for Phase 3 and not yet implemented:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (implemented) |
| POST | `/api/validate` | Validate graph and flow |
| POST | `/api/schedule` | Compute measurement schedule |
| POST | `/api/compute-zflow` | Auto-compute Z-flow from X-flow |

## License

MIT
