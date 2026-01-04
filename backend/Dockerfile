# Development Dockerfile for FastAPI backend
FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy project files
COPY pyproject.toml uv.lock* ./

# Install dependencies
RUN uv sync --frozen || uv sync

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Start development server with hot reload
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
