import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.auth import get_current_user, require_admin, require_role
from app.database import get_session
from app.models.equipment import Equipment, GymEquipment
from app.models.gym import Gym, GymMembership, GymTheme, MembershipStatus
from app.models.user import User, UserRole
from app.schemas.gym import (
    EquipmentCreate,
    GymCreate,
    GymEquipmentResponse,
    GymResponse,
    GymThemeResponse,
    GymThemeUpdate,
    GymUpdate,
    MembershipWithUserResponse,
)

router = APIRouter()


@router.post("", response_model=GymResponse)
def create_gym(
    data: GymCreate,
    user: User = Depends(require_role(UserRole.GYM_OWNER)),
    session: Session = Depends(get_session),
):
    gym = Gym(owner_id=user.id, **data.model_dump())
    session.add(gym)
    session.commit()
    session.refresh(gym)

    # Create default theme
    theme = GymTheme(gym_id=gym.id)
    session.add(theme)
    session.commit()

    return gym


@router.get("", response_model=list[GymResponse])
def list_gyms(
    city: str | None = None,
    search: str | None = None,
    offset: int = 0,
    limit: int = Query(default=20, le=100),
    session: Session = Depends(get_session),
):
    query = select(Gym).where(Gym.is_approved == True)
    if city:
        query = query.where(Gym.city == city)
    if search:
        query = query.where(Gym.name.ilike(f"%{search}%"))
    query = query.offset(offset).limit(limit)
    return session.exec(query).all()


# --- Owner's own gym (includes unapproved) - must be before /{gym_id} routes ---

@router.get("/mine", response_model=GymResponse | None)
def get_my_gym(
    user: User = Depends(require_role(UserRole.GYM_OWNER)),
    session: Session = Depends(get_session),
):
    """Get the current owner's gym, regardless of approval status."""
    gym = session.exec(
        select(Gym).where(Gym.owner_id == user.id)
    ).first()
    if not gym:
        return None
    return gym


# --- Admin (platform owner) - must be before /{gym_id} routes ---

@router.get("/admin/check")
def check_admin(user: User = Depends(require_admin)):
    """Check if current user is a platform admin."""
    return {"is_admin": True}


@router.get("/admin/pending", response_model=list[GymResponse])
def list_pending_gyms(
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    """List all gyms pending approval (admin only)."""
    return session.exec(
        select(Gym).where(Gym.is_approved == False).order_by(Gym.created_at.desc())
    ).all()


@router.get("/admin/all", response_model=list[GymResponse])
def list_all_gyms_admin(
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    """List all gyms (admin only)."""
    return session.exec(
        select(Gym).order_by(Gym.created_at.desc())
    ).all()


@router.post("/admin/{gym_id}/approve", response_model=GymResponse)
def approve_gym(
    gym_id: uuid.UUID,
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    gym.is_approved = True
    session.add(gym)
    session.commit()
    session.refresh(gym)
    return gym


@router.post("/admin/{gym_id}/reject")
def reject_gym(
    gym_id: uuid.UUID,
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    session.delete(gym)
    session.commit()
    return {"ok": True}


@router.delete("/admin/{gym_id}")
def delete_gym(
    gym_id: uuid.UUID,
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    """Delete a gym (admin only). Works for both approved and pending gyms."""
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    session.delete(gym)
    session.commit()
    return {"ok": True}


@router.get("/{gym_id}", response_model=GymResponse)
def get_gym(gym_id: uuid.UUID, session: Session = Depends(get_session)):
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    return gym


@router.patch("/{gym_id}", response_model=GymResponse)
def update_gym(
    gym_id: uuid.UUID,
    data: GymUpdate,
    user: User = Depends(require_role(UserRole.GYM_OWNER)),
    session: Session = Depends(get_session),
):
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    if gym.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your gym")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(gym, key, value)
    gym.updated_at = datetime.utcnow()
    session.add(gym)
    session.commit()
    session.refresh(gym)
    return gym


# --- Equipment ---

@router.get("/{gym_id}/equipment", response_model=list[GymEquipmentResponse])
def list_gym_equipment(
    gym_id: uuid.UUID, session: Session = Depends(get_session)
):
    results = session.exec(
        select(GymEquipment, Equipment)
        .join(Equipment, GymEquipment.equipment_id == Equipment.id)
        .where(GymEquipment.gym_id == gym_id)
    ).all()

    return [
        GymEquipmentResponse(
            id=ge.id,
            equipment_id=ge.equipment_id,
            equipment_name=eq.name,
            category=eq.category,
            quantity=ge.quantity,
            notes=ge.notes,
        )
        for ge, eq in results
    ]


@router.post("/{gym_id}/equipment", response_model=GymEquipmentResponse)
def add_gym_equipment(
    gym_id: uuid.UUID,
    data: EquipmentCreate,
    user: User = Depends(require_role(UserRole.GYM_OWNER)),
    session: Session = Depends(get_session),
):
    gym = session.get(Gym, gym_id)
    if not gym or gym.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your gym")

    equipment = session.get(Equipment, data.equipment_id)
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    ge = GymEquipment(
        gym_id=gym_id,
        equipment_id=data.equipment_id,
        quantity=data.quantity,
        notes=data.notes,
    )
    session.add(ge)
    session.commit()
    session.refresh(ge)

    return GymEquipmentResponse(
        id=ge.id,
        equipment_id=ge.equipment_id,
        equipment_name=equipment.name,
        category=equipment.category,
        quantity=ge.quantity,
        notes=ge.notes,
    )


@router.delete("/{gym_id}/equipment/{equipment_entry_id}")
def remove_gym_equipment(
    gym_id: uuid.UUID,
    equipment_entry_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.GYM_OWNER)),
    session: Session = Depends(get_session),
):
    gym = session.get(Gym, gym_id)
    if not gym or gym.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your gym")

    ge = session.get(GymEquipment, equipment_entry_id)
    if not ge or ge.gym_id != gym_id:
        raise HTTPException(status_code=404, detail="Equipment entry not found")

    session.delete(ge)
    session.commit()
    return {"ok": True}


# --- Theme ---

@router.get("/{gym_id}/theme", response_model=GymThemeResponse)
def get_gym_theme(
    gym_id: uuid.UUID, session: Session = Depends(get_session)
):
    theme = session.exec(
        select(GymTheme).where(GymTheme.gym_id == gym_id)
    ).first()
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return theme


@router.put("/{gym_id}/theme", response_model=GymThemeResponse)
def set_gym_theme(
    gym_id: uuid.UUID,
    data: GymThemeUpdate,
    user: User = Depends(require_role(UserRole.GYM_OWNER)),
    session: Session = Depends(get_session),
):
    gym = session.get(Gym, gym_id)
    if not gym or gym.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your gym")

    theme = session.exec(
        select(GymTheme).where(GymTheme.gym_id == gym_id)
    ).first()

    if theme:
        for key, value in data.model_dump().items():
            setattr(theme, key, value)
    else:
        theme = GymTheme(gym_id=gym_id, **data.model_dump())

    session.add(theme)
    session.commit()
    session.refresh(theme)
    return theme


# --- Members ---

@router.get("/{gym_id}/members", response_model=list[MembershipWithUserResponse])
def list_gym_members(
    gym_id: uuid.UUID,
    status: str | None = None,
    user: User = Depends(require_role(UserRole.GYM_OWNER)),
    session: Session = Depends(get_session),
):
    gym = session.get(Gym, gym_id)
    if not gym or gym.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your gym")

    query = (
        select(GymMembership, User)
        .join(User, GymMembership.user_id == User.id)
        .where(
            GymMembership.gym_id == gym_id,
            GymMembership.is_active == True,
        )
    )
    if status:
        query = query.where(GymMembership.status == status)

    results = session.exec(query).all()
    return [
        MembershipWithUserResponse(
            id=membership.id,
            user_id=membership.user_id,
            gym_id=membership.gym_id,
            status=membership.status,
            is_active=membership.is_active,
            user_email=u.email,
            user_full_name=u.full_name,
        )
        for membership, u in results
    ]
