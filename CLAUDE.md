# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Guidelines

- Respond to prompts in Japanese
- Write all code comments, commits, issues, and PRs in English
- Do not use `git commit --amend --no-edit`; always create new commits

## Project Overview

GraphQOMB Studio is a web application for visually editing Graph, Flow, and Schedule for Measurement-Based Quantum Computing (MBQC). It consists of a Next.js frontend and a FastAPI backend that integrates with the graphqomb Python library.

## Development Commands

### Frontend (Next.js)

```bash
cd frontend
pnpm install              # Install dependencies
pnpm dev                  # Start development server (http://localhost:3000)
pnpm build                # Production build
pnpm typecheck            # TypeScript type checking
pnpm lint                 # Run Biome linter
pnpm lint:fix             # Fix linting issues
pnpm test                 # Run Vitest tests
pnpm test:run             # Run tests once (no watch mode)
```

### Backend (FastAPI)

```bash
cd backend
uv sync                   # Install dependencies
uv run uvicorn src.main:app --reload  # Start dev server (http://localhost:8000)
uv run pytest             # Run tests
uv run ruff check         # Lint
uv run ruff format        # Format
uv run pyright            # Type check
```

### Docker (recommended for full stack)

```bash
docker-compose up         # Start both frontend and backend
```

## Architecture

### Frontend Architecture

**State Management (Zustand stores in `src/stores/`)**:
- `projectStore`: Main project state (nodes, edges, flow definitions, schedule) with localStorage persistence
- `selectionStore`: Currently selected node/edge
- `uiStore`: UI state (view mode, Z-slice for 3D, flow visibility toggles)
- `resolvedFlowStore`: Cached computed flow data

**Component Structure**:
- `components/canvas/`: Graph visualization (2D with React Flow, 3D with Three.js/R3F)
- `components/panels/`: Property editing panels (NodeProperties, FlowEditor, MeasBasisEditor)
- `components/toolbar/`: View controls, Z-slice slider
- `components/timeline/`: Schedule visualization

**Key Libraries**:
- `@xyflow/react`: 2D graph canvas
- `three` + `@react-three/fiber` + `@react-three/drei`: 3D visualization
- `zod`: Schema validation for project files (`src/schemas/`)

### Backend Architecture

**API Layer (`src/routers/`)**:
- `validate.py`: Graph structure and flow validation
- `schedule.py`: Measurement schedule computation
- `flow.py`: Z-flow auto-computation from X-flow

**Service Layer (`src/services/`)**:
- `converter.py`: Converts frontend DTOs to graphqomb library objects and back

**Integration with graphqomb**:
- The backend acts as a thin API layer over the graphqomb library
- All quantum computing logic (GraphState, flow checking, scheduling) lives in graphqomb
- DTOs translate between frontend JSON format and graphqomb's internal representation

### Data Flow

1. Frontend stores project state in `projectStore` (nodes, edges, flow)
2. API calls send project data to backend endpoints
3. Backend converts DTOs to graphqomb objects via `converter.py`
4. graphqomb performs validation/scheduling/computation
5. Results convert back to DTOs and return to frontend
6. Frontend updates state and displays results

## Code Standards

### Frontend
- TypeScript strict mode
- Biome for linting/formatting (line width 100, double quotes)
- Vitest for testing

### Backend
- Python 3.12+
- Ruff for linting/formatting (line length 120)
- Pyright strict mode for type checking
- Pytest with pytest-asyncio

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/validate` | Validate graph and flow definitions |
| POST | `/api/schedule` | Compute measurement schedule |
| POST | `/api/compute-zflow` | Auto-compute Z-flow from X-flow |

## Development Cautions

- Update CHANGELOG.md whenever modified the source code.
