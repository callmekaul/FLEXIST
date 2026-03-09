import uuid

from sqlmodel import Field, SQLModel


class Equipment(SQLModel, table=True):
    """Master catalog of equipment types."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(unique=True)
    category: str  # free_weights, machines, cardio, bodyweight


class GymEquipment(SQLModel, table=True):
    """Equipment available at a specific gym."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    gym_id: uuid.UUID = Field(foreign_key="gym.id", index=True)
    equipment_id: uuid.UUID = Field(foreign_key="equipment.id")
    quantity: int = 1
    notes: str | None = None
