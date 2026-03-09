from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models.exercise import Exercise, ExerciseType

router = APIRouter()


@router.get("")
def list_exercises(
    search: str | None = None,
    exercise_type: ExerciseType | None = None,
    offset: int = 0,
    limit: int = Query(default=50, le=200),
    session: Session = Depends(get_session),
):
    query = select(Exercise)
    if search:
        query = query.where(Exercise.name.ilike(f"%{search}%"))
    if exercise_type:
        query = query.where(Exercise.exercise_type == exercise_type)
    query = query.order_by(Exercise.name).offset(offset).limit(limit)
    return session.exec(query).all()
