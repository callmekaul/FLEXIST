import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlmodel import Field, SQLModel


class UserRole(str, enum.Enum):
    CLIENT = "client"
    GYM_OWNER = "gym_owner"


class ExperienceLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    supabase_uid: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    full_name: str
    role: UserRole

    # Physical profile (filled after onboarding)
    age: int | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    gender: str | None = None
    experience_level: ExperienceLevel | None = None
    fitness_goals: list[str] = Field(
        default=[], sa_column=Column(ARRAY(String))
    )
    dietary_preferences: list[str] = Field(
        default=[], sa_column=Column(ARRAY(String))
    )

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
