import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, text
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models.exercise import Exercise
from app.models.gym import GymMembership
from app.models.leaderboard import LeaderboardEntry
from app.models.user import User
from app.models.workout import ExerciseLog, WorkoutLog

router = APIRouter()


def _period_cutoff(period: str) -> datetime | None:
    now = datetime.utcnow()
    if period == "weekly":
        return now - timedelta(days=7)
    if period == "monthly":
        return now - timedelta(days=30)
    return None  # all_time


def _compute_max_weight(
    session: Session, exercise_id: uuid.UUID, cutoff: datetime | None
) -> list[tuple[uuid.UUID, float]]:
    """Score = heaviest single weight_kg lifted for this exercise."""
    stmt = (
        select(
            WorkoutLog.user_id,
            func.max(ExerciseLog.weight_kg).label("score"),
        )
        .join(ExerciseLog, ExerciseLog.workout_log_id == WorkoutLog.id)
        .where(
            ExerciseLog.exercise_id == exercise_id,
            ExerciseLog.weight_kg.isnot(None),
        )
        .group_by(WorkoutLog.user_id)
    )
    if cutoff:
        stmt = stmt.where(WorkoutLog.started_at >= cutoff)
    rows = session.exec(stmt).all()
    return [(r[0], float(r[1])) for r in rows if r[1]]


def _compute_total_volume(
    session: Session, exercise_id: uuid.UUID, cutoff: datetime | None
) -> list[tuple[uuid.UUID, float]]:
    """Score = total (weight_kg * reps) for this exercise."""
    stmt = (
        select(
            WorkoutLog.user_id,
            func.sum(ExerciseLog.weight_kg * ExerciseLog.reps).label("score"),
        )
        .join(ExerciseLog, ExerciseLog.workout_log_id == WorkoutLog.id)
        .where(
            ExerciseLog.exercise_id == exercise_id,
            ExerciseLog.weight_kg.isnot(None),
            ExerciseLog.reps.isnot(None),
        )
        .group_by(WorkoutLog.user_id)
    )
    if cutoff:
        stmt = stmt.where(WorkoutLog.started_at >= cutoff)
    rows = session.exec(stmt).all()
    return [(r[0], float(r[1] or 0)) for r in rows if r[1]]


CATEGORY_FNS = {
    "max_weight": _compute_max_weight,
    "total_volume": _compute_total_volume,
}


@router.get("/exercises")
def list_ranked_exercises(
    session: Session = Depends(get_session),
):
    """Return exercises that have at least one logged set (for the dropdown)."""
    exercise_ids = session.exec(
        select(ExerciseLog.exercise_id).distinct()
    ).all()
    if not exercise_ids:
        return []
    exercises = session.exec(
        select(Exercise)
        .where(Exercise.id.in_(exercise_ids))
        .order_by(Exercise.name)
    ).all()
    return [
        {"id": str(e.id), "name": e.name, "exercise_type": e.exercise_type.value}
        for e in exercises
    ]


@router.post("/compute")
def compute_leaderboard(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Recompute all leaderboard entries from exercise logs."""
    # Clear existing entries
    session.exec(text("DELETE FROM leaderboardentry"))

    # Get all exercises that have been logged
    exercise_ids = session.exec(
        select(ExerciseLog.exercise_id).distinct()
    ).all()

    # Get gym memberships for per-gym rankings
    gym_users_rows = session.exec(
        select(GymMembership.gym_id, GymMembership.user_id)
        .where(GymMembership.status == "approved")
    ).all()
    gym_map: dict[uuid.UUID, set[uuid.UUID]] = {}
    for gid, uid in gym_users_rows:
        gym_map.setdefault(gid, set()).add(uid)

    entries: list[LeaderboardEntry] = []

    for exercise_id in exercise_ids:
        for period in ("weekly", "monthly", "all_time"):
            cutoff = _period_cutoff(period)
            for category, fn in CATEGORY_FNS.items():
                scores = fn(session, exercise_id, cutoff)
                scores.sort(key=lambda x: x[1], reverse=True)

                # Global rankings
                for rank, (uid, score) in enumerate(scores, 1):
                    entries.append(
                        LeaderboardEntry(
                            user_id=uid,
                            gym_id=None,
                            exercise_id=exercise_id,
                            category=category,
                            score=score,
                            rank=rank,
                            period=period,
                        )
                    )

                # Per-gym rankings
                score_map = {uid: s for uid, s in scores}
                for gid, members in gym_map.items():
                    gym_scores = [
                        (uid, score_map[uid])
                        for uid in members
                        if uid in score_map
                    ]
                    gym_scores.sort(key=lambda x: x[1], reverse=True)
                    for rank, (uid, score) in enumerate(gym_scores, 1):
                        entries.append(
                            LeaderboardEntry(
                                user_id=uid,
                                gym_id=gid,
                                exercise_id=exercise_id,
                                category=category,
                                score=score,
                                rank=rank,
                                period=period,
                            )
                        )

    session.add_all(entries)
    session.commit()
    return {"ok": True, "entries_created": len(entries)}


def _format_entries(rows: list) -> list[dict]:
    return [
        {
            "id": str(entry.id),
            "user_id": str(entry.user_id),
            "user_name": name,
            "exercise_id": str(entry.exercise_id),
            "score": entry.score,
            "rank": entry.rank,
            "category": entry.category,
            "period": entry.period,
        }
        for entry, name in rows
    ]


@router.get("")
def get_global_leaderboard(
    exercise_id: uuid.UUID,
    category: str = "max_weight",
    period: str = "all_time",
    limit: int = Query(default=50, le=100),
    session: Session = Depends(get_session),
):
    rows = session.exec(
        select(LeaderboardEntry, User.full_name)
        .join(User, User.id == LeaderboardEntry.user_id)
        .where(
            LeaderboardEntry.gym_id == None,
            LeaderboardEntry.exercise_id == exercise_id,
            LeaderboardEntry.category == category,
            LeaderboardEntry.period == period,
        )
        .order_by(LeaderboardEntry.rank)
        .limit(limit)
    ).all()
    return _format_entries(rows)


@router.get("/gym/{gym_id}")
def get_gym_leaderboard(
    gym_id: uuid.UUID,
    exercise_id: uuid.UUID,
    category: str = "max_weight",
    period: str = "all_time",
    limit: int = Query(default=50, le=100),
    session: Session = Depends(get_session),
):
    rows = session.exec(
        select(LeaderboardEntry, User.full_name)
        .join(User, User.id == LeaderboardEntry.user_id)
        .where(
            LeaderboardEntry.gym_id == gym_id,
            LeaderboardEntry.exercise_id == exercise_id,
            LeaderboardEntry.category == category,
            LeaderboardEntry.period == period,
        )
        .order_by(LeaderboardEntry.rank)
        .limit(limit)
    ).all()
    return _format_entries(rows)


@router.get("/me")
def get_my_rank(
    exercise_id: uuid.UUID,
    category: str = "max_weight",
    period: str = "all_time",
    gym_id: uuid.UUID | None = None,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Return the current user's rank for a specific exercise/category/period."""
    entry = session.exec(
        select(LeaderboardEntry)
        .where(
            LeaderboardEntry.user_id == user.id,
            LeaderboardEntry.exercise_id == exercise_id,
            LeaderboardEntry.category == category,
            LeaderboardEntry.period == period,
            LeaderboardEntry.gym_id == gym_id,
        )
    ).first()
    if not entry:
        return None
    return {
        "id": str(entry.id),
        "user_id": str(entry.user_id),
        "user_name": user.full_name,
        "exercise_id": str(entry.exercise_id),
        "score": entry.score,
        "rank": entry.rank,
        "category": entry.category,
        "period": entry.period,
    }
