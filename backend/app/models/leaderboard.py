import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class LeaderboardEntry(SQLModel, table=True):
    """Cached leaderboard rows, recomputed periodically."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    gym_id: uuid.UUID | None = Field(
        default=None, foreign_key="gym.id", index=True
    )
    exercise_id: uuid.UUID = Field(foreign_key="exercise.id", index=True)
    category: str  # max_weight, total_volume
    score: float
    rank: int
    period: str  # weekly, monthly, all_time
    computed_at: datetime = Field(default_factory=datetime.utcnow)
