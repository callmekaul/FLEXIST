import uuid
from datetime import datetime

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSON
from sqlmodel import Field, SQLModel


class DietPlan(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    title: str
    target_calories: int | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    meals: dict = Field(default={}, sa_column=Column(JSON))
    ai_reasoning: str | None = None
    is_ai_generated: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
