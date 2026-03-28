import time
import uuid
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.logging_config import setup_logging
from app.routers import users, profiles, library, trips, bags, checklist, generation, accommodations, profile_bags, admin, chat
from app.utils.exceptions import NotFoundError, ForbiddenError

setup_logging()

logger = logging.getLogger("api")

app = FastAPI(
    title="Lisztomania API",
    description="AI-powered packing list app backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    return JSONResponse(status_code=404, content={"detail": exc.detail})


@app.exception_handler(ForbiddenError)
async def forbidden_handler(request: Request, exc: ForbiddenError):
    return JSONResponse(status_code=403, content={"detail": exc.detail})


@app.middleware("http")
async def request_logging(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start = time.monotonic()
    response = await call_next(request)
    duration_ms = (time.monotonic() - start) * 1000
    logger.info(
        "request completed",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round(duration_ms, 1),
        },
    )
    return response

API_PREFIX = "/api/v1"

app.include_router(users.router, prefix=API_PREFIX)
app.include_router(profiles.router, prefix=API_PREFIX)
app.include_router(library.router, prefix=API_PREFIX)
app.include_router(trips.router, prefix=API_PREFIX)
app.include_router(bags.router, prefix=API_PREFIX)
app.include_router(checklist.router, prefix=API_PREFIX)
app.include_router(generation.router, prefix=API_PREFIX)
app.include_router(accommodations.router, prefix=API_PREFIX)
app.include_router(profile_bags.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)
app.include_router(chat.router, prefix=API_PREFIX)

@app.get("/health")
async def health():
    return {"status": "ok"}
