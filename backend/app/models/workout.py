import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.exercise import ExerciseType


class WorkoutPlan(SQLModel, table=True):
    """AI-generated or manually created workout plan."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    title: str
    description: str | None = None
    is_ai_generated: bool = False
    ai_reasoning: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WorkoutPlanExercise(SQLModel, table=True):
    """Prescribed exercises in a workout plan (the template)."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    plan_id: uuid.UUID = Field(foreign_key="workoutplan.id", index=True)
    exercise_id: uuid.UUID = Field(foreign_key="exercise.id")
    day_of_week: int = Field(default=0)  # 0=Monday, 6=Sunday
    order: int

    # For sets_reps type
    target_sets: int | None = None
    target_reps: int | None = None
    target_weight_kg: float | None = None

    # For time_based type
    target_duration_seconds: int | None = None
    target_distance_km: float | None = None

    rest_seconds: int | None = None
    notes: str | None = None


class WorkoutLog(SQLModel, table=True):
    """A completed workout session."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    plan_id: uuid.UUID | None = Field(
        default=None, foreign_key="workoutplan.id"
    )
    day_of_week: int | None = None  # which day of the weekly plan was logged
    started_at: datetime
    completed_at: datetime | None = None
    notes: str | None = None
    rating: int | None = None  # 1-5 subjective difficulty

    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExerciseLog(SQLModel, table=True):
    """Individual exercise performance within a workout.

    One row per set for sets_reps exercises (bench 3x10 = 3 rows).
    One row per entry for time_based exercises.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    workout_log_id: uuid.UUID = Field(foreign_key="workoutlog.id", index=True)
    exercise_id: uuid.UUID = Field(foreign_key="exercise.id")
    exercise_type: ExerciseType
    order: int

    # Sets/reps fields (NULL for time-based)
    set_number: int | None = None
    reps: int | None = None
    weight_kg: float | None = None

    # Time-based fields (NULL for sets/reps)
    duration_seconds: int | None = None
    distance_km: float | None = None

    # Common
    is_personal_record: bool = False
    notes: str | None = None
    logged_at: datetime = Field(default_factory=datetime.utcnow)
