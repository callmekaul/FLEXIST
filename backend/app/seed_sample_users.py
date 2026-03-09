"""Seed 10 sample client accounts with workout logs and body measurements.

5 users are members of "Aditya's Gym", 5 are not.
All users get the default starter workout plan + several logged workouts.
Run from backend/: python -m app.seed_sample_users
"""

import random
import uuid
from datetime import datetime, timedelta

import httpx
from sqlmodel import Session, select

from app.config import settings
from app.database import engine
from app.models.body_measurement import BodyMeasurement
from app.models.exercise import Exercise, ExerciseType
from app.models.gym import Gym, GymMembership
from app.models.user import User, UserRole
from app.models.workout import (
    ExerciseLog,
    WorkoutLog,
    WorkoutPlan,
    WorkoutPlanExercise,
)
from app.routers.auth import DEFAULT_PLAN, create_default_workout_plan

PASSWORD = "Housr@2026!!"

# 5 gym members, 5 non-members
SAMPLE_USERS = [
    # (full_name, email, gender, age, weight_kg, height_cm) — gym members
    ("Rahul Sharma", "rahul@test.com", "male", 25, 72.0, 175),
    ("Priya Patel", "priya@test.com", "female", 23, 58.0, 162),
    ("Arjun Reddy", "arjun@test.com", "male", 28, 80.0, 178),
    ("Sneha Iyer", "sneha@test.com", "female", 26, 55.0, 160),
    ("Vikram Singh", "vikram@test.com", "male", 30, 85.0, 182),
    # non-members
    ("Ananya Gupta", "ananya@test.com", "female", 22, 52.0, 158),
    ("Karthik Nair", "karthik@test.com", "male", 27, 75.0, 176),
    ("Divya Menon", "divya@test.com", "female", 24, 60.0, 165),
    ("Rohan Joshi", "rohan@test.com", "male", 29, 78.0, 174),
    ("Meera Krishnan", "meera@test.com", "female", 21, 50.0, 155),
]

GYM_MEMBER_COUNT = 5  # first 5 are gym members


def signup_supabase_user(email: str, password: str) -> str | None:
    """Create a Supabase auth user, return the UID. If already exists, sign in instead."""
    headers = {
        "apikey": settings.supabase_anon_key,
        "Content-Type": "application/json",
    }
    # Try signup first
    resp = httpx.post(
        f"{settings.supabase_url}/auth/v1/signup",
        json={"email": email, "password": password},
        headers=headers,
        timeout=15,
    )
    data = resp.json()
    user_obj = data.get("user") or data
    uid = user_obj.get("id")

    # If signup returned empty identities, user already exists — sign in
    if uid and user_obj.get("identities") is not None and len(user_obj.get("identities", [])) == 0:
        uid = None

    if not uid:
        # Try signing in (user may already exist from previous run)
        resp2 = httpx.post(
            f"{settings.supabase_url}/auth/v1/token?grant_type=password",
            json={"email": email, "password": password},
            headers=headers,
            timeout=15,
        )
        data2 = resp2.json()
        user_obj2 = data2.get("user") or data2
        uid = user_obj2.get("id")
        if uid:
            print(f"  Supabase user exists: {email} -> {uid}")
            return uid
        print(f"  Failed to get UID for {email}")
        return None

    print(f"  Supabase user created: {email} -> {uid}")
    return uid


def seed():
    with Session(engine) as session:
        # Find "Aditya's Gym"
        gym = session.exec(select(Gym).where(Gym.name == "Aditya's Gym")).first()
        if not gym:
            print("ERROR: 'Aditya's Gym' not found in database. Create it first.")
            return
        print(f"Found gym: {gym.name} (id={gym.id})")

        # Load exercises for workout logging
        all_exercises = {e.name: e for e in session.exec(select(Exercise)).all()}
        if not all_exercises:
            print("ERROR: No exercises in DB. Run seed.py first.")
            return
        print(f"Found {len(all_exercises)} exercises")

        created_users: list[tuple[User, dict]] = []

        # --- Step 1: Create Supabase auth users + backend profiles ---
        print("\n--- Creating users ---")
        for i, (name, email, gender, age, weight, height) in enumerate(SAMPLE_USERS):
            # Check if user already exists in backend
            existing = session.exec(
                select(User).where(User.email == email)
            ).first()
            if existing:
                print(f"  {name} already exists, skipping creation")
                created_users.append(
                    (existing, {"gender": gender, "age": age, "weight": weight, "height": height})
                )
                continue

            # Sign up in Supabase
            uid = signup_supabase_user(email, PASSWORD)
            if not uid:
                continue

            # Create backend user
            user = User(
                supabase_uid=uid,
                email=email,
                full_name=name,
                role=UserRole.CLIENT,
                age=age,
                weight_kg=weight,
                height_cm=height,
                gender=gender,
                experience_level="beginner",
                fitness_goals=["general_fitness"],
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            print(f"  Backend user created: {name} (id={user.id})")

            # Create default workout plan
            create_default_workout_plan(user.id, session)
            print(f"  Default workout plan created for {name}")

            created_users.append(
                (user, {"gender": gender, "age": age, "weight": weight, "height": height})
            )

        # --- Step 2: Gym memberships for first 5 ---
        print("\n--- Creating gym memberships ---")
        for i, (user, _) in enumerate(created_users[:GYM_MEMBER_COUNT]):
            existing_mem = session.exec(
                select(GymMembership).where(
                    GymMembership.user_id == user.id,
                    GymMembership.gym_id == gym.id,
                )
            ).first()
            if existing_mem:
                print(f"  {user.full_name} already a member")
                continue
            mem = GymMembership(
                user_id=user.id,
                gym_id=gym.id,
                status="approved",
                is_active=True,
            )
            session.add(mem)
            print(f"  {user.full_name} added to {gym.name}")
        session.commit()

        # --- Step 3: Body measurements ---
        print("\n--- Creating body measurements ---")
        for user, info in created_users:
            existing_meas = session.exec(
                select(BodyMeasurement).where(BodyMeasurement.user_id == user.id)
            ).first()
            if existing_meas:
                print(f"  {user.full_name} already has measurements")
                continue
            meas = BodyMeasurement(
                user_id=user.id,
                weight_kg=info["weight"],
                height_cm=info["height"],
                bicep_cm=round(random.uniform(25, 38), 1) if info["gender"] == "male" else round(random.uniform(22, 30), 1),
                chest_cm=round(random.uniform(90, 110), 1) if info["gender"] == "male" else round(random.uniform(78, 95), 1),
                waist_cm=round(random.uniform(76, 90), 1) if info["gender"] == "male" else round(random.uniform(64, 78), 1),
                hip_cm=round(random.uniform(90, 102), 1) if info["gender"] == "male" else round(random.uniform(88, 100), 1),
                thigh_cm=round(random.uniform(50, 60), 1) if info["gender"] == "male" else round(random.uniform(46, 56), 1),
                measured_at=datetime.utcnow() - timedelta(days=random.randint(1, 7)),
            )
            session.add(meas)
            print(f"  Measurements added for {user.full_name}")
        session.commit()

        # --- Step 4: Log workouts (for leaderboard data) ---
        print("\n--- Logging workouts ---")
        for user, info in created_users:
            # Check if user already has workout logs
            existing_logs = session.exec(
                select(WorkoutLog).where(WorkoutLog.user_id == user.id)
            ).first()
            if existing_logs:
                print(f"  {user.full_name} already has workout logs")
                continue

            # Get user's workout plan
            plan = session.exec(
                select(WorkoutPlan).where(WorkoutPlan.user_id == user.id)
            ).first()
            if not plan:
                print(f"  No plan found for {user.full_name}, skipping logs")
                continue

            # Get plan exercises grouped by day
            plan_exercises = session.exec(
                select(WorkoutPlanExercise)
                .where(WorkoutPlanExercise.plan_id == plan.id)
                .order_by(WorkoutPlanExercise.day_of_week, WorkoutPlanExercise.order)
            ).all()

            exercises_by_day: dict[int, list[WorkoutPlanExercise]] = {}
            for pe in plan_exercises:
                exercises_by_day.setdefault(pe.day_of_week, []).append(pe)

            # Strength multiplier based on gender/weight
            strength = info["weight"] / 70.0  # normalize around 70kg
            if info["gender"] == "female":
                strength *= 0.6

            # Log 2-3 weeks of workouts (random days, 3-4 per week)
            num_weeks = random.randint(2, 3)
            base_date = datetime.utcnow() - timedelta(days=num_weeks * 7)

            for week in range(num_weeks):
                # Pick 3-4 training days this week
                training_days = sorted(random.sample([0, 1, 2, 3, 4], k=random.randint(3, 4)))
                for day in training_days:
                    day_exercises = exercises_by_day.get(day, [])
                    if not day_exercises:
                        continue

                    workout_date = base_date + timedelta(days=week * 7 + day)
                    duration_min = random.randint(40, 70)
                    start_hour = random.randint(6, 18)
                    started = workout_date.replace(hour=start_hour, minute=0, second=0)
                    completed = started + timedelta(minutes=duration_min)

                    wlog = WorkoutLog(
                        user_id=user.id,
                        plan_id=plan.id,
                        day_of_week=day,
                        started_at=started,
                        completed_at=completed,
                        rating=random.randint(3, 5),
                    )
                    session.add(wlog)
                    session.flush()

                    for order, pe in enumerate(day_exercises):
                        exercise = all_exercises.get(
                            next(
                                (n for n, e in all_exercises.items() if e.id == pe.exercise_id),
                                "",
                            )
                        )
                        if not exercise:
                            continue

                        if exercise.exercise_type == ExerciseType.TIME_BASED:
                            # Log one time-based entry
                            elog = ExerciseLog(
                                workout_log_id=wlog.id,
                                exercise_id=exercise.id,
                                exercise_type=ExerciseType.TIME_BASED,
                                order=order,
                                duration_seconds=random.randint(30, 90),
                            )
                            session.add(elog)
                        else:
                            # Log 3 sets with realistic weights
                            target_sets = pe.target_sets or 3
                            target_reps = pe.target_reps or 12
                            base_weight = _base_weight_for_exercise(exercise.name, strength)

                            for s in range(1, target_sets + 1):
                                # Slight variation per set, fatigue on later sets
                                reps = max(
                                    target_reps - random.randint(0, 2) - (s - 1),
                                    target_reps - 4,
                                )
                                weight = base_weight * random.uniform(0.9, 1.1)
                                # Small progression over weeks
                                weight = _snap_to_2_5(weight * (1 + week * 0.05))

                                elog = ExerciseLog(
                                    workout_log_id=wlog.id,
                                    exercise_id=exercise.id,
                                    exercise_type=ExerciseType.SETS_REPS,
                                    order=order,
                                    set_number=s,
                                    reps=reps,
                                    weight_kg=weight,
                                )
                                session.add(elog)

            session.commit()
            print(f"  Logged workouts for {user.full_name}")

        print("\n--- Done! ---")
        print(f"Created {len(created_users)} users")
        print(f"{GYM_MEMBER_COUNT} gym members, {len(created_users) - GYM_MEMBER_COUNT} non-members")
        print("Remember to recompute leaderboard via POST /api/leaderboard/compute")


def _base_weight_for_exercise(name: str, strength: float) -> float:
    """Return a realistic beginner base weight (kg) for common exercises."""
    weights = {
        # Chest
        "Machine Chest Press": 30,
        "Dumbbell Bench Press": 12,
        "Pec Deck Fly": 20,
        "Push-Ups": 0,  # bodyweight, will use 0
        # Back
        "Lat Pulldown": 30,
        "Seated Cable Row": 25,
        "Machine Row": 30,
        "Dumbbell Row": 12,
        # Legs
        "Leg Press": 60,
        "Goblet Squat": 12,
        "Leg Extension": 25,
        "Leg Curl": 20,
        "Body Weight Squat": 0,
        # Shoulders
        "Lateral Raises": 5,
        "Dumbbell Shoulder Press": 10,
        "Face Pulls": 15,
        "Front Raises": 5,
        # Arms
        "Dumbbell Curl": 8,
        "Tricep Pushdown": 15,
        "Hammer Curl": 8,
        "Cable Curl": 15,
        # Core
        "Hanging Leg Raise": 0,
        "Cable Crunch": 20,
        "Dead Bug": 0,
        "Bicycle Crunches": 0,
        "Leg Raises": 0,
    }
    base = weights.get(name, 10)
    if base == 0:
        return 0  # bodyweight exercises
    return base * strength


def _snap_to_2_5(weight: float) -> float:
    """Round weight to nearest 2.5 kg increment."""
    return round(round(weight / 2.5) * 2.5, 1)


if __name__ == "__main__":
    seed()
