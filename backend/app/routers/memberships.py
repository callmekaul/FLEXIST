import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import get_current_user, require_role
from app.database import get_session
from app.models.gym import Gym, GymMembership, MembershipStatus
from app.models.user import User, UserRole
from app.schemas.gym import GymResponse, MembershipResponse

router = APIRouter()


@router.post("/join", response_model=MembershipResponse)
def request_to_join_gym(
    gym_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")

    # Check if already has a pending or approved membership for this gym
    existing = session.exec(
        select(GymMembership).where(
            GymMembership.user_id == user.id,
            GymMembership.gym_id == gym_id,
            GymMembership.is_active == True,
        )
    ).first()
    if existing:
        if existing.status == MembershipStatus.PENDING:
            raise HTTPException(status_code=400, detail="Request already pending")
        if existing.status == MembershipStatus.APPROVED:
            raise HTTPException(status_code=400, detail="Already a member of this gym")

    membership = GymMembership(
        user_id=user.id,
        gym_id=gym_id,
        status=MembershipStatus.PENDING,
    )
    session.add(membership)
    session.commit()
    session.refresh(membership)
    return membership


@router.post("/{membership_id}/approve", response_model=MembershipResponse)
def approve_membership(
    membership_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.GYM_OWNER)),
    session: Session = Depends(get_session),
):
    membership = session.get(GymMembership, membership_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    gym = session.get(Gym, membership.gym_id)
    if not gym or gym.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your gym")

    if membership.status != MembershipStatus.PENDING:
        raise HTTPException(status_code=400, detail="Membership is not pending")

    # Deactivate any existing approved membership the user has at other gyms
    existing_approved = session.exec(
        select(GymMembership).where(
            GymMembership.user_id == membership.user_id,
            GymMembership.status == MembershipStatus.APPROVED,
            GymMembership.is_active == True,
        )
    ).all()
    for m in existing_approved:
        m.is_active = False
        session.add(m)

    membership.status = MembershipStatus.APPROVED
    session.add(membership)
    session.commit()
    session.refresh(membership)
    return membership


@router.post("/{membership_id}/reject", response_model=MembershipResponse)
def reject_membership(
    membership_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.GYM_OWNER)),
    session: Session = Depends(get_session),
):
    membership = session.get(GymMembership, membership_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    gym = session.get(Gym, membership.gym_id)
    if not gym or gym.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your gym")

    if membership.status != MembershipStatus.PENDING:
        raise HTTPException(status_code=400, detail="Membership is not pending")

    membership.status = MembershipStatus.REJECTED
    membership.is_active = False
    session.add(membership)
    session.commit()
    session.refresh(membership)
    return membership


@router.post("/{membership_id}/remove")
def remove_member(
    membership_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.GYM_OWNER)),
    session: Session = Depends(get_session),
):
    membership = session.get(GymMembership, membership_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    gym = session.get(Gym, membership.gym_id)
    if not gym or gym.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your gym")

    membership.is_active = False
    session.add(membership)
    session.commit()
    return {"ok": True}


@router.delete("/leave")
def leave_gym(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    membership = session.exec(
        select(GymMembership).where(
            GymMembership.user_id == user.id,
            GymMembership.status == MembershipStatus.APPROVED,
            GymMembership.is_active == True,
        )
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="No active membership")

    membership.is_active = False
    session.add(membership)
    session.commit()
    return {"ok": True}


@router.get("/my-gym", response_model=GymResponse | None)
def get_my_gym(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Gym owners: return the gym they own
    if user.role == "gym_owner":
        gym = session.exec(
            select(Gym).where(Gym.owner_id == user.id)
        ).first()
        if gym:
            return gym

    # Clients: return gym via approved membership only
    membership = session.exec(
        select(GymMembership).where(
            GymMembership.user_id == user.id,
            GymMembership.status == MembershipStatus.APPROVED,
            GymMembership.is_active == True,
        )
    ).first()
    if not membership:
        return None

    return session.get(Gym, membership.gym_id)


@router.get("/my-status")
def get_my_membership_status(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get the user's current membership status (pending/approved/none)."""
    membership = session.exec(
        select(GymMembership).where(
            GymMembership.user_id == user.id,
            GymMembership.is_active == True,
        )
    ).first()
    if not membership:
        return {"status": None, "gym_id": None}
    return {"status": membership.status, "gym_id": str(membership.gym_id)}
