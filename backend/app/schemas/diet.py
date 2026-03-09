import uuid
from datetime import datetime

from pydantic import BaseModel


class DietPlanCreate(BaseModel):
    title: str
    target_calories: int | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    meals: dict = {}
    ai_reasoning: str | None = None
    is_ai_generated: bool = False


class DietPlanResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    target_calories: int | None
    protein_g: float | None
    carbs_g: float | None
    fat_g: float | None
    meals: dict
    ai_reasoning: str | None
    is_ai_generated: bool
    created_at: datetime

    model_config = {"from_attributes": True}
