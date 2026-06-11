"""GraphQOMB Studio Backend API entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routers import flow_router, imports_router, schedule_router, validate_router

LOCAL_FRONTEND_ORIGIN_REGEX = r"^http://(localhost|127\.0\.0\.1):\d+$"

app = FastAPI(
    title="GraphQOMB Studio API",
    description="Backend API for GraphQOMB Studio - Visual MBQC editor",
    version="0.1.0",
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_origin_regex=LOCAL_FRONTEND_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(validate_router)
app.include_router(schedule_router)
app.include_router(flow_router)
app.include_router(imports_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}
