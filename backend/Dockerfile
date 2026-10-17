# Development Dockerfile for FastAPI backend
FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Preserve the sibling checkout layout required by the local uv source.
COPY --from=graphqomb pyproject.toml README.md LICENSE /workspace/graphqomb/
COPY --from=graphqomb graphqomb /workspace/graphqomb/graphqomb

WORKDIR /workspace/graphqomb-studio/backend

# Copy project files
COPY pyproject.toml uv.lock* ./

# Install dependencies
RUN uv sync --frozen

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Start development server with hot reload
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
