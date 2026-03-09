import uuid

from pydantic import BaseModel


class GymCreate(BaseModel):
    name: str
    description: str | None = None
    address: str
    city: str
    latitude: float | None = None
    longitude: float | None = None


class GymUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    address: str | None = None
    city: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    logo_url: str | None = None


class GymResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    description: str | None
    address: str
    city: str
    latitude: float | None
    longitude: float | None
    logo_url: str | None
    is_approved: bool

    model_config = {"from_attributes": True}


class GymThemeUpdate(BaseModel):
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    foreground_color: str


class GymThemeResponse(BaseModel):
    gym_id: uuid.UUID
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    foreground_color: str

    model_config = {"from_attributes": True}


class EquipmentCreate(BaseModel):
    equipment_id: uuid.UUID
    quantity: int = 1
    notes: str | None = None


class GymEquipmentResponse(BaseModel):
    id: uuid.UUID
    equipment_id: uuid.UUID
    equipment_name: str
    category: str
    quantity: int
    notes: str | None

    model_config = {"from_attributes": True}


class MembershipResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    gym_id: uuid.UUID
    status: str
    is_active: bool

    model_config = {"from_attributes": True}


class MembershipWithUserResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    gym_id: uuid.UUID
    status: str
    is_active: bool
    user_email: str
    user_full_name: str

    model_config = {"from_attributes": True}
