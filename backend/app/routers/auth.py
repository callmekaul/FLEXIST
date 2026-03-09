import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models.exercise import Exercise
from app.models.user import User
from app.models.workout import WorkoutPlan, WorkoutPlanExercise
from app.schemas.user import UserCreate, UserResponse

router = APIRouter()

# Default 5-day beginner full body plan: (exercise_name, target_sets, target_reps, rest_seconds)
# Uses machines, bodyweight, and light dumbbells — safe for absolute beginners.
DEFAULT_PLAN = {
    0: [  # Monday
        ("Machine Chest Press", 3, 12, 90),
        ("Lat Pulldown", 3, 12, 90),
        ("Leg Press", 3, 12, 90),
        ("Lateral Raises", 2, 15, 60),
        ("Dumbbell Curl", 2, 12, 60),
        ("Plank", None, None, None),  # time-based: 30-60s
    ],
    1: [  # Tuesday
        ("Dumbbell Bench Press", 3, 12, 90),
        ("Seated Cable Row", 3, 12, 90),
        ("Goblet Squat", 3, 12, 90),
        ("Dumbbell Shoulder Press", 3, 12, 90),
        ("Tricep Pushdown", 2, 12, 60),
        ("Dead Bug", 2, 10, 60),
    ],
    2: [  # Wednesday
        ("Pec Deck Fly", 3, 12, 60),
        ("Machine Row", 3, 12, 90),
        ("Leg Extension", 3, 15, 60),
        ("Leg Curl", 3, 15, 60),
        ("Face Pulls", 2, 15, 60),
        ("Leg Raises", 2, 12, 60),
    ],
    3: [  # Thursday
        ("Push-Ups", 3, 10, 60),
        ("Lat Pulldown", 3, 12, 90),
        ("Leg Press", 3, 12, 90),
        ("Lateral Raises", 2, 15, 60),
        ("Hammer Curl", 2, 12, 60),
        ("Bicycle Crunches", 2, 15, 60),
    ],
    4: [  # Friday
        ("Machine Chest Press", 3, 12, 90),
        ("Dumbbell Row", 3, 12, 90),
        ("Body Weight Squat", 3, 15, 60),
        ("Front Raises", 2, 12, 60),
        ("Cable Curl", 2, 12, 60),
        ("Plank", None, None, None),  # time-based: 30-60s
    ],
}


def create_default_workout_plan(user_id: uuid.UUID, session: Session) -> None:
    """Create a default 5-day full body workout plan for new client users."""
    # Look up all needed exercises by name
    exercise_names = {
        name for day_exercises in DEFAULT_PLAN.values() for name, *_ in day_exercises
    }
    exercises = session.exec(
        select(Exercise).where(Exercise.name.in_(exercise_names))  # type: ignore[attr-defined]
    ).all()
    exercise_map = {e.name: e for e in exercises}

    if not exercise_map:
        return  # No exercises seeded yet, skip

    plan = WorkoutPlan(
        user_id=user_id,
        title="Starter Full Body Plan",
        description="A balanced 5-day full body workout plan to get you started. Monday through Friday with weekends off.",
        is_ai_generated=False,
    )
    session.add(plan)
    session.flush()  # Get plan.id

    for day, day_exercises in DEFAULT_PLAN.items():
        for order, (name, sets, reps, rest) in enumerate(day_exercises):
            exercise = exercise_map.get(name)
            if not exercise:
                continue
            plan_exercise = WorkoutPlanExercise(
                plan_id=plan.id,
                exercise_id=exercise.id,
                day_of_week=day,
                order=order,
            )
            if exercise.exercise_type.value == "time_based":
                plan_exercise.target_duration_seconds = 60  # 60s default
            else:
                plan_exercise.target_sets = sets
                plan_exercise.target_reps = reps
            if rest:
                plan_exercise.rest_seconds = rest
            session.add(plan_exercise)

    session.commit()


@router.post("/register-profile", response_model=UserResponse)
def register_profile(
    data: UserCreate, session: Session = Depends(get_session)
):
    # Check by supabase_uid first, then by email
    existing = session.exec(
        select(User).where(User.supabase_uid == data.supabase_uid)
    ).first()
    if existing:
        return existing  # Already registered, return existing profile

    existing_email = session.exec(
        select(User).where(User.email == data.email)
    ).first()
    if existing_email:
        # Email exists with different supabase_uid — update the uid
        existing_email.supabase_uid = data.supabase_uid
        session.add(existing_email)
        session.commit()
        session.refresh(existing_email)
        return existing_email

    user = User(
        supabase_uid=data.supabase_uid,
        email=data.email,
        full_name=data.full_name,
        role=data.role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # Create default workout plan for client users
    if data.role == "client":
        create_default_workout_plan(user.id, session)

    return user


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return user
