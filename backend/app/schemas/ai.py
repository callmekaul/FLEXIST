import uuid

from pydantic import BaseModel


class WorkoutGenerateRequest(BaseModel):
    current_weight: float | None = None
    current_height: float | None = None
    goals: str | None = None
    days_per_week: int = 5
    skill_level: str | None = None  # beginner/intermediate/advanced
    comments: str | None = None
    tailor_to_gym: bool = False


class DietGenerateRequest(BaseModel):
    current_weight: float | None = None
    current_height: float | None = None
    activity_level: str | None = None  # sedentary/lightly_active/active/very_active
    workout_plan_id: uuid.UUID | None = None
    target_calories: int | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    meals_per_day: int = 3
    dietary_restrictions: str | None = None
    comments: str | None = None


class ProgressAnalysisRequest(BaseModel):
    weeks: int = 4
    injuries: str | None = None
