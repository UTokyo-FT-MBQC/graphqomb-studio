# GraphQOMB Studio

A web application for visually editing Graph, Flow, and Schedule for Measurement-Based Quantum Computing (MBQC).

## Features

- **Graph Editor**: Create and edit MBQC resource graphs with an intuitive 2D canvas
- **Node Management**: Define input, output, and intermediate nodes with measurement bases
- **Edge Connections**: Connect nodes to build quantum graph states
- **Flow Definition**: Configure X-flow and Z-flow for classical feedforward
- **Schedule Visualization**: View computed measurement schedules in a timeline
- **Import/Export**: Save and load projects in JSON format

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript 5.7+ (strict mode)
- Tailwind CSS 4
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
| POST | `/api/validate` | Validate graph and flow |
| POST | `/api/schedule` | Compute measurement schedule |
| POST | `/api/compute-zflow` | Auto-compute Z-flow from X-flow |

## License

MIT
