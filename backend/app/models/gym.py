import enum
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class Gym(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    name: str
    description: str | None = None
    address: str
    city: str
    latitude: float | None = None
    longitude: float | None = None
    logo_url: str | None = None
    is_approved: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GymTheme(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    gym_id: uuid.UUID = Field(foreign_key="gym.id", unique=True, index=True)
    primary_color: str = "#6366f1"
    secondary_color: str = "#8b5cf6"
    accent_color: str = "#f59e0b"
    background_color: str = "#09090b"
    foreground_color: str = "#fafafa"


class MembershipStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class GymMembership(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    gym_id: uuid.UUID = Field(foreign_key="gym.id", index=True)
    status: str = Field(default=MembershipStatus.PENDING)
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
