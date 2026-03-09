import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models.body_measurement import BodyMeasurement
from app.models.user import User
from app.schemas.user import (
    BodyMeasurementCreate,
    BodyMeasurementResponse,
    UserResponse,
    UserUpdate,
)

router = APIRouter()


@router.patch("/me", response_model=UserResponse)
def update_me(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    user.updated_at = datetime.utcnow()
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


# --- Body Measurements ---


@router.get("/me/measurements", response_model=list[BodyMeasurementResponse])
def list_measurements(
    user: User = Depends(get_current_user),
    limit: int = Query(default=100, le=500),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(BodyMeasurement)
        .where(BodyMeasurement.user_id == user.id)
        .order_by(BodyMeasurement.measured_at.asc())
        .limit(limit)
    ).all()


@router.post("/me/measurements", response_model=BodyMeasurementResponse)
def add_measurement(
    data: BodyMeasurementCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    measurement = BodyMeasurement(user_id=user.id, **data.model_dump(exclude_none=True))
    session.add(measurement)

    # Also update the user's current weight/height
    if data.weight_kg is not None:
        user.weight_kg = data.weight_kg
    if data.height_cm is not None:
        user.height_cm = data.height_cm
    user.updated_at = datetime.utcnow()
    session.add(user)

    session.commit()
    session.refresh(measurement)
    return measurement


@router.delete("/me/measurements/{measurement_id}")
def delete_measurement(
    measurement_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    m = session.get(BodyMeasurement, measurement_id)
    if not m or m.user_id != user.id:
        raise HTTPException(status_code=404, detail="Measurement not found")
    session.delete(m)
    session.commit()
    return {"ok": True}
