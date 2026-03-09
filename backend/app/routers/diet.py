import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models.diet import DietPlan
from app.models.user import User
from app.schemas.diet import DietPlanCreate, DietPlanResponse

router = APIRouter()


@router.post("", response_model=DietPlanResponse)
def create_diet_plan(
    data: DietPlanCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    plan = DietPlan(user_id=user.id, **data.model_dump())
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan


@router.get("", response_model=list[DietPlanResponse])
def list_diet_plans(
    user: User = Depends(get_current_user),
    offset: int = 0,
    limit: int = Query(default=20, le=100),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(DietPlan)
        .where(DietPlan.user_id == user.id)
        .order_by(DietPlan.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()


@router.get("/{plan_id}", response_model=DietPlanResponse)
def get_diet_plan(
    plan_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    plan = session.get(DietPlan, plan_id)
    if not plan or plan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Diet plan not found")
    return plan


@router.delete("/{plan_id}")
def delete_diet_plan(
    plan_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    plan = session.get(DietPlan, plan_id)
    if not plan or plan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Diet plan not found")
    session.delete(plan)
    session.commit()
    return {"ok": True}
