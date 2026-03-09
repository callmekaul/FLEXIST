import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.exercise import ExerciseType


class WorkoutPlanCreate(BaseModel):
    title: str
    description: str | None = None
    is_ai_generated: bool = False
    ai_reasoning: str | None = None
    exercises: list["WorkoutPlanExerciseCreate"] = []


class WorkoutPlanExerciseCreate(BaseModel):
    exercise_id: uuid.UUID
    day_of_week: int = 0
    order: int
    target_sets: int | None = None
    target_reps: int | None = None
    target_weight_kg: float | None = None
    target_duration_seconds: int | None = None
    target_distance_km: float | None = None
    rest_seconds: int | None = None
    notes: str | None = None


class WorkoutPlanExerciseResponse(BaseModel):
    id: uuid.UUID
    exercise_id: uuid.UUID
    exercise_name: str | None = None
    exercise_type: str | None = None
    muscle_groups: list[str] = []
    day_of_week: int = 0
    order: int
    target_sets: int | None
    target_reps: int | None
    target_weight_kg: float | None
    target_duration_seconds: int | None
    target_distance_km: float | None
    rest_seconds: int | None
    notes: str | None

    model_config = {"from_attributes": True}


class WorkoutPlanResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: str | None
    is_ai_generated: bool
    ai_reasoning: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkoutLogCreate(BaseModel):
    plan_id: uuid.UUID | None = None
    day_of_week: int | None = None
    started_at: datetime
    completed_at: datetime | None = None
    notes: str | None = None
    rating: int | None = None


class WorkoutLogResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    plan_id: uuid.UUID | None
    day_of_week: int | None
    started_at: datetime
    completed_at: datetime | None
    notes: str | None
    rating: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ExerciseLogCreate(BaseModel):
    exercise_id: uuid.UUID
    exercise_type: ExerciseType
    order: int
    set_number: int | None = None
    reps: int | None = None
    weight_kg: float | None = None
    duration_seconds: int | None = None
    distance_km: float | None = None
    notes: str | None = None


class ExerciseLogResponse(BaseModel):
    id: uuid.UUID
    workout_log_id: uuid.UUID
    exercise_id: uuid.UUID
    exercise_name: str | None = None
    exercise_type: ExerciseType
    muscle_groups: list[str] = []
    order: int
    set_number: int | None
    reps: int | None
    weight_kg: float | None
    duration_seconds: int | None
    distance_km: float | None
    is_personal_record: bool
    notes: str | None
    logged_at: datetime

    model_config = {"from_attributes": True}
