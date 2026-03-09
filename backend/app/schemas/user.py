import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.user import ExperienceLevel, UserRole


class UserCreate(BaseModel):
    supabase_uid: str
    email: str
    full_name: str
    role: UserRole


class UserUpdate(BaseModel):
    full_name: str | None = None
    age: int | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    gender: str | None = None
    experience_level: ExperienceLevel | None = None
    fitness_goals: list[str] | None = None
    dietary_preferences: list[str] | None = None


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    age: int | None
    weight_kg: float | None
    height_cm: float | None
    gender: str | None
    experience_level: ExperienceLevel | None
    fitness_goals: list[str]
    dietary_preferences: list[str]

    model_config = {"from_attributes": True}


class BodyMeasurementCreate(BaseModel):
    weight_kg: float | None = None
    height_cm: float | None = None
    bicep_cm: float | None = None
    chest_cm: float | None = None
    waist_cm: float | None = None
    hip_cm: float | None = None
    thigh_cm: float | None = None
    calf_cm: float | None = None
    forearm_cm: float | None = None
    neck_cm: float | None = None
    measured_at: datetime | None = None
    notes: str | None = None


class BodyMeasurementResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    weight_kg: float | None
    height_cm: float | None
    bicep_cm: float | None
    chest_cm: float | None
    waist_cm: float | None
    hip_cm: float | None
    thigh_cm: float | None
    calf_cm: float | None
    forearm_cm: float | None
    neck_cm: float | None
    measured_at: datetime
    notes: str | None

    model_config = {"from_attributes": True}
