import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import get_current_user
from app.config import settings
from app.database import get_session
from app.models.body_measurement import BodyMeasurement
from app.models.equipment import GymEquipment
from app.models.exercise import Exercise
from app.models.gym import Gym, GymMembership, MembershipStatus
from app.models.user import User
from app.models.workout import ExerciseLog, WorkoutLog
from app.schemas.ai import DietGenerateRequest, ProgressAnalysisRequest, WorkoutGenerateRequest
from app.services.ai.analysis_chain import analyze_progress
from app.services.ai.diet_chain import generate_diet_plan
from app.services.ai.workout_chain import generate_workout_plan

router = APIRouter()

# Per-user daily rate limit for AI endpoints
DAILY_AI_LIMIT = 5
_usage: dict[tuple[uuid.UUID, date], int] = defaultdict(int)


def _check_api_key():
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")


def _check_rate_limit(user_id: uuid.UUID):
    key = (user_id, date.today())
    if _usage[key] >= DAILY_AI_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Daily AI limit reached ({DAILY_AI_LIMIT} requests/day). Try again tomorrow.",
        )
    _usage[key] += 1

    # Clean up old entries to prevent memory leak
    today = date.today()
    stale = [k for k in _usage if k[1] < today]
    for k in stale:
        del _usage[k]


@router.post("/generate-workout")
async def generate_workout_endpoint(
    req: WorkoutGenerateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _check_api_key()
    _check_rate_limit(user.id)

    exercises = session.exec(select(Exercise)).all()
    if not exercises:
        raise HTTPException(status_code=400, detail="No exercises in catalog. Seed the database first.")

    if req.tailor_to_gym:
        # Find the user's gym
        gym_id = None
        if user.role == "gym_owner":
            gym = session.exec(select(Gym).where(Gym.owner_id == user.id)).first()
            if gym:
                gym_id = gym.id
        else:
            membership = session.exec(
                select(GymMembership).where(
                    GymMembership.user_id == user.id,
                    GymMembership.status == MembershipStatus.APPROVED,
                    GymMembership.is_active == True,
                )
            ).first()
            if membership:
                gym_id = membership.gym_id

        if gym_id:
            gym_equipment_ids = set(
                ge.equipment_id
                for ge in session.exec(
                    select(GymEquipment).where(GymEquipment.gym_id == gym_id)
                ).all()
            )
            # Keep exercises that need no equipment or whose equipment is at the gym
            exercises = [
                ex for ex in exercises
                if ex.equipment_id is None or ex.equipment_id in gym_equipment_ids
            ]

    result = await generate_workout_plan(user, req, exercises)
    return result


@router.post("/generate-diet")
async def generate_diet_endpoint(
    req: DietGenerateRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _check_api_key()
    _check_rate_limit(user.id)
    result = await generate_diet_plan(user, req)
    return result


@router.post("/analyze-progress")
async def analyze_progress_endpoint(
    req: ProgressAnalysisRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _check_api_key()
    _check_rate_limit(user.id)

    cutoff = datetime.utcnow() - timedelta(weeks=req.weeks)

    logs = session.exec(
        select(WorkoutLog)
        .where(WorkoutLog.user_id == user.id)
        .where(WorkoutLog.started_at >= cutoff)
        .order_by(WorkoutLog.started_at.desc())
    ).all()

    log_ids = [log.id for log in logs]
    exercise_logs = []
    if log_ids:
        exercise_logs = session.exec(
            select(ExerciseLog)
            .where(ExerciseLog.workout_log_id.in_(log_ids))
        ).all()

        exercise_ids = set(el.exercise_id for el in exercise_logs)
        if exercise_ids:
            exercises_db = session.exec(
                select(Exercise).where(Exercise.id.in_(exercise_ids))
            ).all()
            name_map = {ex.id: ex.name for ex in exercises_db}
            for el in exercise_logs:
                el._exercise_name = name_map.get(el.exercise_id)

    measurements = session.exec(
        select(BodyMeasurement)
        .where(BodyMeasurement.user_id == user.id)
        .where(BodyMeasurement.measured_at >= cutoff)
        .order_by(BodyMeasurement.measured_at)
    ).all()

    result = await analyze_progress(
        user, logs, exercise_logs, measurements,
        weeks=req.weeks, injuries=req.injuries,
    )
    return result
