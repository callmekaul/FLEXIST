import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class BodyMeasurement(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    measured_at: datetime = Field(default_factory=datetime.utcnow, index=True)
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
    notes: str | None = None
