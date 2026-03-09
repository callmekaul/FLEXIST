import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models.exercise import Exercise
from app.models.user import User
from app.models.workout import (
    ExerciseLog,
    WorkoutLog,
    WorkoutPlan,
    WorkoutPlanExercise,
)
from app.schemas.workout import (
    ExerciseLogCreate,
    ExerciseLogResponse,
    WorkoutLogCreate,
    WorkoutLogResponse,
    WorkoutPlanCreate,
    WorkoutPlanExerciseResponse,
    WorkoutPlanResponse,
)

router = APIRouter()


# --- Plans ---

@router.post("/plans", response_model=WorkoutPlanResponse)
def create_plan(
    data: WorkoutPlanCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    plan = WorkoutPlan(
        user_id=user.id,
        title=data.title,
        description=data.description,
        is_ai_generated=data.is_ai_generated,
        ai_reasoning=data.ai_reasoning,
    )
    session.add(plan)
    session.flush()

    for ex in data.exercises:
        plan_ex = WorkoutPlanExercise(
            plan_id=plan.id, **ex.model_dump()
        )
        session.add(plan_ex)

    session.commit()
    session.refresh(plan)
    return plan


@router.get("/plans", response_model=list[WorkoutPlanResponse])
def list_plans(
    user: User = Depends(get_current_user),
    offset: int = 0,
    limit: int = Query(default=20, le=100),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(WorkoutPlan)
        .where(WorkoutPlan.user_id == user.id)
        .order_by(WorkoutPlan.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()


@router.get("/plans/{plan_id}", response_model=WorkoutPlanResponse)
def get_plan(
    plan_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    plan = session.get(WorkoutPlan, plan_id)
    if not plan or plan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.get("/plans/{plan_id}/exercises", response_model=list[WorkoutPlanExerciseResponse])
def get_plan_exercises(
    plan_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    plan = session.get(WorkoutPlan, plan_id)
    if not plan or plan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Plan not found")

    results = session.exec(
        select(WorkoutPlanExercise, Exercise)
        .join(Exercise, WorkoutPlanExercise.exercise_id == Exercise.id)
        .where(WorkoutPlanExercise.plan_id == plan_id)
        .order_by(WorkoutPlanExercise.day_of_week, WorkoutPlanExercise.order)
    ).all()

    return [
        WorkoutPlanExerciseResponse(
            id=pe.id,
            exercise_id=pe.exercise_id,
            exercise_name=ex.name,
            exercise_type=ex.exercise_type.value,
            muscle_groups=ex.muscle_groups or [],
            day_of_week=pe.day_of_week,
            order=pe.order,
            target_sets=pe.target_sets,
            target_reps=pe.target_reps,
            target_weight_kg=pe.target_weight_kg,
            target_duration_seconds=pe.target_duration_seconds,
            target_distance_km=pe.target_distance_km,
            rest_seconds=pe.rest_seconds,
            notes=pe.notes,
        )
        for pe, ex in results
    ]


@router.delete("/plans/{plan_id}")
def delete_plan(
    plan_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    plan = session.get(WorkoutPlan, plan_id)
    if not plan or plan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Delete plan exercises first
    plan_exercises = session.exec(
        select(WorkoutPlanExercise).where(WorkoutPlanExercise.plan_id == plan_id)
    ).all()
    for pe in plan_exercises:
        session.delete(pe)

    session.delete(plan)
    session.commit()
    return {"ok": True}


# --- Logs ---

@router.post("/logs", response_model=WorkoutLogResponse)
def create_log(
    data: WorkoutLogCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    log = WorkoutLog(user_id=user.id, **data.model_dump())
    session.add(log)
    session.commit()
    session.refresh(log)
    return log


@router.get("/logs", response_model=list[WorkoutLogResponse])
def list_logs(
    user: User = Depends(get_current_user),
    offset: int = 0,
    limit: int = Query(default=20, le=100),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(WorkoutLog)
        .where(WorkoutLog.user_id == user.id)
        .order_by(WorkoutLog.started_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()


@router.get("/logs/{log_id}", response_model=WorkoutLogResponse)
def get_log(
    log_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    log = session.get(WorkoutLog, log_id)
    if not log or log.user_id != user.id:
        raise HTTPException(status_code=404, detail="Workout log not found")
    return log


@router.delete("/logs/{log_id}")
def delete_log(
    log_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    log = session.get(WorkoutLog, log_id)
    if not log or log.user_id != user.id:
        raise HTTPException(status_code=404, detail="Workout log not found")

    # Delete exercise logs first
    exercise_logs = session.exec(
        select(ExerciseLog).where(ExerciseLog.workout_log_id == log_id)
    ).all()
    for el in exercise_logs:
        session.delete(el)

    session.delete(log)
    session.commit()
    return {"ok": True}


@router.patch("/logs/{log_id}", response_model=WorkoutLogResponse)
def update_log(
    log_id: uuid.UUID,
    started_at: datetime | None = None,
    completed_at: datetime | None = None,
    notes: str | None = None,
    rating: int | None = None,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    log = session.get(WorkoutLog, log_id)
    if not log or log.user_id != user.id:
        raise HTTPException(status_code=404, detail="Workout log not found")
    if started_at is not None:
        log.started_at = started_at
    if completed_at is not None:
        log.completed_at = completed_at
    if notes is not None:
        log.notes = notes
    if rating is not None:
        log.rating = rating
    session.add(log)
    session.commit()
    session.refresh(log)
    return log


@router.post("/logs/{log_id}/exercises", response_model=list[ExerciseLogResponse])
def add_exercise_logs(
    log_id: uuid.UUID,
    entries: list[ExerciseLogCreate],
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    log = session.get(WorkoutLog, log_id)
    if not log or log.user_id != user.id:
        raise HTTPException(status_code=404, detail="Workout log not found")

    created = []
    for entry in entries:
        exercise_log = ExerciseLog(
            workout_log_id=log_id, **entry.model_dump()
        )
        session.add(exercise_log)
        created.append(exercise_log)

    session.commit()
    for el in created:
        session.refresh(el)
    return created


@router.get("/exercise-logs")
def list_all_exercise_logs(
    user: User = Depends(get_current_user),
    limit: int = Query(default=500, le=1000),
    session: Session = Depends(get_session),
):
    """Get all exercise logs for the current user (for charts/volume tracking)."""
    rows = session.exec(
        select(ExerciseLog)
        .join(WorkoutLog, ExerciseLog.workout_log_id == WorkoutLog.id)
        .where(WorkoutLog.user_id == user.id)
        .order_by(ExerciseLog.logged_at.desc())
        .limit(limit)
    ).all()
    return [
        {
            "id": str(el.id),
            "weight_kg": el.weight_kg,
            "reps": el.reps,
            "duration_seconds": el.duration_seconds,
            "is_personal_record": el.is_personal_record,
            "logged_at": el.logged_at.isoformat(),
        }
        for el in rows
    ]


@router.get("/logs/{log_id}/exercises", response_model=list[ExerciseLogResponse])
def get_exercise_logs(
    log_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    log = session.get(WorkoutLog, log_id)
    if not log or log.user_id != user.id:
        raise HTTPException(status_code=404, detail="Workout log not found")

    results = session.exec(
        select(ExerciseLog, Exercise)
        .join(Exercise, ExerciseLog.exercise_id == Exercise.id)
        .where(ExerciseLog.workout_log_id == log_id)
        .order_by(ExerciseLog.order, ExerciseLog.set_number)
    ).all()

    return [
        ExerciseLogResponse(
            id=el.id,
            workout_log_id=el.workout_log_id,
            exercise_id=el.exercise_id,
            exercise_name=ex.name,
            exercise_type=el.exercise_type,
            muscle_groups=ex.muscle_groups or [],
            order=el.order,
            set_number=el.set_number,
            reps=el.reps,
            weight_kg=el.weight_kg,
            duration_seconds=el.duration_seconds,
            distance_km=el.distance_km,
            is_personal_record=el.is_personal_record,
            notes=el.notes,
            logged_at=el.logged_at,
        )
        for el, ex in results
    ]
