import enum
import uuid

from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlmodel import Field, SQLModel


class ExerciseType(str, enum.Enum):
    SETS_REPS = "sets_reps"
    TIME_BASED = "time_based"


class Exercise(SQLModel, table=True):
    """Master catalog of exercises."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(unique=True, index=True)
    exercise_type: ExerciseType
    muscle_groups: list[str] = Field(
        default=[], sa_column=Column(ARRAY(String))
    )
    equipment_id: uuid.UUID | None = Field(
        default=None, foreign_key="equipment.id"
    )
    description: str | None = None
