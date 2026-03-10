import logging
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from app.database import create_db_and_tables, get_session
from app.models.equipment import Equipment
from app.routers import auth, users, gyms, memberships, workouts, exercises, diet, ai, leaderboard

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    from app.seed import seed_all
    seed_all()
    logger.info(f"CORS allowed origins: {cors_origins}")
    yield


app = FastAPI(title="Flexist API", version="0.1.0", lifespan=lifespan)

cors_origins = ["http://localhost:3000"]
frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
if frontend_url:
    cors_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(gyms.router, prefix="/api/gyms", tags=["gyms"])
app.include_router(memberships.router, prefix="/api/memberships", tags=["memberships"])
app.include_router(workouts.router, prefix="/api/workouts", tags=["workouts"])
app.include_router(exercises.router, prefix="/api/exercises", tags=["exercises"])
app.include_router(diet.router, prefix="/api/diet-plans", tags=["diet"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "debug-v2"}


@app.get("/api/equipment", tags=["equipment"])
def list_equipment_catalog(
    search: str | None = None,
    category: str | None = None,
    offset: int = 0,
    limit: int = Query(default=50, le=200),
    session: Session = Depends(get_session),
):
    query = select(Equipment)
    if search:
        query = query.where(Equipment.name.ilike(f"%{search}%"))
    if category:
        query = query.where(Equipment.category == category)
    query = query.order_by(Equipment.name).offset(offset).limit(limit)
    return session.exec(query).all()
