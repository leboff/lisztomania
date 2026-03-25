from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import users, profiles, library, trips, bags, checklist, generation, accommodations

app = FastAPI(
    title="Lisztomania API",
    description="AI-powered packing list app backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

app.include_router(users.router, prefix=API_PREFIX)
app.include_router(profiles.router, prefix=API_PREFIX)
app.include_router(library.router, prefix=API_PREFIX)
app.include_router(trips.router, prefix=API_PREFIX)
app.include_router(bags.router, prefix=API_PREFIX)
app.include_router(checklist.router, prefix=API_PREFIX)
app.include_router(generation.router, prefix=API_PREFIX)
app.include_router(accommodations.router, prefix=API_PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok"}
