"""Seed the database with equipment and exercise catalogs."""
from sqlmodel import Session, select

from app.database import engine
from app.models.equipment import Equipment
from app.models.exercise import Exercise, ExerciseType

EQUIPMENT = [
    # Free Weights
    ("Barbell", "free_weights"),
    ("Dumbbell", "free_weights"),
    ("EZ Curl Bar", "free_weights"),
    ("Kettlebell", "free_weights"),
    ("Weight Plates", "free_weights"),
    ("Trap Bar", "free_weights"),
    # Machines
    ("Cable Machine", "machines"),
    ("Smith Machine", "machines"),
    ("Leg Press Machine", "machines"),
    ("Lat Pulldown Machine", "machines"),
    ("Chest Press Machine", "machines"),
    ("Shoulder Press Machine", "machines"),
    ("Leg Extension Machine", "machines"),
    ("Leg Curl Machine", "machines"),
    ("Pec Deck Machine", "machines"),
    ("Seated Row Machine", "machines"),
    ("Hack Squat Machine", "machines"),
    ("Calf Raise Machine", "machines"),
    ("Hip Abductor Machine", "machines"),
    ("Hip Adductor Machine", "machines"),
    ("Assisted Pull-Up Machine", "machines"),
    # Cardio
    ("Treadmill", "cardio"),
    ("Stationary Bike", "cardio"),
    ("Elliptical", "cardio"),
    ("Rowing Machine", "cardio"),
    ("Stair Climber", "cardio"),
    ("Assault Bike", "cardio"),
    ("Spin Bike", "cardio"),
    # Bodyweight / Other
    ("Pull-Up Bar", "bodyweight"),
    ("Dip Station", "bodyweight"),
    ("Bench (Flat)", "bodyweight"),
    ("Bench (Adjustable)", "bodyweight"),
    ("Resistance Bands", "bodyweight"),
    ("Medicine Ball", "bodyweight"),
    ("Stability Ball", "bodyweight"),
    ("Foam Roller", "bodyweight"),
    ("Battle Ropes", "bodyweight"),
    ("TRX / Suspension Trainer", "bodyweight"),
    ("Plyo Box", "bodyweight"),
    ("Ab Wheel", "bodyweight"),
]

# (name, type, muscle_groups, equipment_name or None)
EXERCISES = [
    # ---- CHEST ----
    ("Barbell Bench Press", "sets_reps", ["Mid and Lower Chest", "Long Head Tricep", "Lateral Head Triceps", "Anterior Deltoid"], "Barbell"),
    ("Incline Barbell Bench Press", "sets_reps", ["Upper Pectoralis", "Anterior Deltoid", "Long Head Tricep", "Lateral Head Triceps"], "Barbell"),
    ("Dumbbell Bench Press", "sets_reps", ["Mid and Lower Chest", "Long Head Tricep", "Lateral Head Triceps"], "Dumbbell"),
    ("Incline Dumbbell Press", "sets_reps", ["Upper Pectoralis", "Anterior Deltoid", "Long Head Tricep"], "Dumbbell"),
    ("Dumbbell Flyes", "sets_reps", ["Mid and Lower Chest", "Upper Pectoralis"], "Dumbbell"),
    ("Cable Crossover", "sets_reps", ["Mid and Lower Chest", "Upper Pectoralis"], "Cable Machine"),
    ("Machine Chest Press", "sets_reps", ["Mid and Lower Chest", "Lateral Head Triceps", "Anterior Deltoid"], "Chest Press Machine"),
    ("Pec Deck Fly", "sets_reps", ["Mid and Lower Chest", "Upper Pectoralis"], "Pec Deck Machine"),
    ("Push-Ups", "sets_reps", ["Mid and Lower Chest", "Anterior Deltoid", "Long Head Tricep", "Medial Head Triceps"], None),
    ("Decline Push-Ups", "sets_reps", ["Upper Pectoralis", "Anterior Deltoid", "Long Head Tricep"], None),

    # ---- BACK ----
    ("Barbell Deadlift", "sets_reps", ["Lower Back", "Gluteus Maximus", "Medial Hamstrings", "Lateral Hamstrings", "Upper Traps", "Wrist Flexors"], "Barbell"),
    ("Barbell Row", "sets_reps", ["Lats", "Lower Traps", "Posterior Deltoid", "Short Head Bicep", "Wrist Flexors"], "Barbell"),
    ("Dumbbell Row", "sets_reps", ["Lats", "Lower Traps", "Posterior Deltoid", "Short Head Bicep"], "Dumbbell"),
    ("Pull-Ups", "sets_reps", ["Lats", "Lower Traps", "Short Head Bicep", "Long Head Bicep", "Wrist Flexors"], "Pull-Up Bar"),
    ("Chin-Ups", "sets_reps", ["Lats", "Long Head Bicep", "Short Head Bicep", "Lower Traps"], "Pull-Up Bar"),
    ("Lat Pulldown", "sets_reps", ["Lats", "Lower Traps", "Short Head Bicep", "Long Head Bicep"], "Lat Pulldown Machine"),
    ("Seated Cable Row", "sets_reps", ["Lats", "Lower Traps", "Posterior Deltoid"], "Cable Machine"),
    ("Machine Row", "sets_reps", ["Lats", "Lower Traps", "Posterior Deltoid"], "Seated Row Machine"),
    ("T-Bar Row", "sets_reps", ["Lats", "Lower Traps", "Posterior Deltoid", "Short Head Bicep"], "Barbell"),
    ("Face Pulls", "sets_reps", ["Posterior Deltoid", "Lower Traps", "Upper Traps"], "Cable Machine"),

    # ---- SHOULDERS ----
    ("Overhead Press", "sets_reps", ["Anterior Deltoid", "Lateral Deltoid", "Long Head Tricep", "Upper Traps"], "Barbell"),
    ("Dumbbell Shoulder Press", "sets_reps", ["Anterior Deltoid", "Lateral Deltoid", "Long Head Tricep"], "Dumbbell"),
    ("Machine Shoulder Press", "sets_reps", ["Anterior Deltoid", "Lateral Deltoid"], "Shoulder Press Machine"),
    ("Lateral Raises", "sets_reps", ["Lateral Deltoid"], "Dumbbell"),
    ("Front Raises", "sets_reps", ["Anterior Deltoid"], "Dumbbell"),
    ("Rear Delt Flyes", "sets_reps", ["Posterior Deltoid", "Lower Traps"], "Dumbbell"),
    ("Cable Lateral Raise", "sets_reps", ["Lateral Deltoid"], "Cable Machine"),
    ("Arnold Press", "sets_reps", ["Anterior Deltoid", "Lateral Deltoid", "Long Head Tricep"], "Dumbbell"),
    ("Upright Row", "sets_reps", ["Lateral Deltoid", "Upper Traps", "Anterior Deltoid"], "Barbell"),
    ("Shrugs", "sets_reps", ["Upper Traps"], "Dumbbell"),

    # ---- ARMS ----
    ("Barbell Curl", "sets_reps", ["Short Head Bicep", "Long Head Bicep"], "Barbell"),
    ("Dumbbell Curl", "sets_reps", ["Short Head Bicep", "Long Head Bicep"], "Dumbbell"),
    ("Hammer Curl", "sets_reps", ["Long Head Bicep", "Wrist Extensors", "Wrist Flexors"], "Dumbbell"),
    ("Preacher Curl", "sets_reps", ["Short Head Bicep", "Long Head Bicep"], "EZ Curl Bar"),
    ("Cable Curl", "sets_reps", ["Short Head Bicep", "Long Head Bicep"], "Cable Machine"),
    ("Concentration Curl", "sets_reps", ["Short Head Bicep"], "Dumbbell"),
    ("Tricep Pushdown", "sets_reps", ["Lateral Head Triceps", "Medial Head Triceps"], "Cable Machine"),
    ("Overhead Tricep Extension", "sets_reps", ["Long Head Tricep", "Medial Head Triceps"], "Dumbbell"),
    ("Skull Crushers", "sets_reps", ["Long Head Tricep", "Lateral Head Triceps", "Medial Head Triceps"], "EZ Curl Bar"),
    ("Dips", "sets_reps", ["Long Head Tricep", "Lateral Head Triceps", "Mid and Lower Chest", "Anterior Deltoid"], "Dip Station"),
    ("Close-Grip Bench Press", "sets_reps", ["Lateral Head Triceps", "Medial Head Triceps", "Mid and Lower Chest"], "Barbell"),
    ("Cable Overhead Extension", "sets_reps", ["Long Head Tricep", "Medial Head Triceps"], "Cable Machine"),

    # ---- LEGS ----
    ("Barbell Squat", "sets_reps", ["Rectus Femoris", "Inner Quadriceps", "Outer Quadricep", "Gluteus Maximus", "Medial Hamstrings"], "Barbell"),
    ("Front Squat", "sets_reps", ["Rectus Femoris", "Inner Quadriceps", "Outer Quadricep", "Upper Abdominals"], "Barbell"),
    ("Goblet Squat", "sets_reps", ["Rectus Femoris", "Inner Quadriceps", "Gluteus Maximus"], "Dumbbell"),
    ("Leg Press", "sets_reps", ["Rectus Femoris", "Inner Quadriceps", "Outer Quadricep", "Gluteus Maximus"], "Leg Press Machine"),
    ("Hack Squat", "sets_reps", ["Rectus Femoris", "Outer Quadricep", "Inner Quadriceps"], "Hack Squat Machine"),
    ("Romanian Deadlift", "sets_reps", ["Medial Hamstrings", "Lateral Hamstrings", "Gluteus Maximus", "Lower Back"], "Barbell"),
    ("Dumbbell Romanian Deadlift", "sets_reps", ["Medial Hamstrings", "Lateral Hamstrings", "Gluteus Maximus"], "Dumbbell"),
    ("Bulgarian Split Squat", "sets_reps", ["Rectus Femoris", "Gluteus Maximus", "Gluteus Medius"], "Dumbbell"),
    ("Walking Lunges", "sets_reps", ["Rectus Femoris", "Gluteus Maximus", "Gluteus Medius"], "Dumbbell"),
    ("Leg Extension", "sets_reps", ["Rectus Femoris", "Inner Quadriceps", "Outer Quadricep"], "Leg Extension Machine"),
    ("Leg Curl", "sets_reps", ["Medial Hamstrings", "Lateral Hamstrings"], "Leg Curl Machine"),
    ("Calf Raises", "sets_reps", ["Gastrocnemius", "Soleus"], "Calf Raise Machine"),
    ("Hip Thrust", "sets_reps", ["Gluteus Maximus", "Gluteus Medius", "Medial Hamstrings"], "Barbell"),
    ("Sumo Deadlift", "sets_reps", ["Gluteus Maximus", "Inner Thigh", "Medial Hamstrings", "Lateral Hamstrings"], "Barbell"),
    ("Step-Ups", "sets_reps", ["Rectus Femoris", "Gluteus Maximus", "Gastrocnemius"], "Plyo Box"),

    # ---- CORE ----
    ("Plank", "time_based", ["Upper Abdominals", "Lower Abdominals", "Obliques"], None),
    ("Side Plank", "time_based", ["Obliques", "Gluteus Medius"], None),
    ("Hanging Leg Raise", "sets_reps", ["Lower Abdominals", "Upper Abdominals", "Wrist Flexors"], "Pull-Up Bar"),
    ("Cable Crunch", "sets_reps", ["Upper Abdominals", "Lower Abdominals"], "Cable Machine"),
    ("Ab Wheel Rollout", "sets_reps", ["Upper Abdominals", "Lower Abdominals", "Lats"], "Ab Wheel"),
    ("Russian Twist", "sets_reps", ["Obliques", "Upper Abdominals"], "Medicine Ball"),
    ("Mountain Climbers", "time_based", ["Lower Abdominals", "Upper Abdominals", "Anterior Deltoid"], None),
    ("Dead Bug", "sets_reps", ["Lower Abdominals", "Upper Abdominals"], None),
    ("Bicycle Crunches", "sets_reps", ["Obliques", "Upper Abdominals", "Lower Abdominals"], None),
    ("Leg Raises", "sets_reps", ["Lower Abdominals", "Upper Abdominals"], None),

    # ---- CARDIO / TIME-BASED ----
    ("Treadmill Run", "time_based", ["Gastrocnemius", "Soleus", "Rectus Femoris", "Medial Hamstrings"], "Treadmill"),
    ("Treadmill Walk (Incline)", "time_based", ["Gluteus Maximus", "Gastrocnemius", "Soleus"], "Treadmill"),
    ("Stationary Bike", "time_based", ["Rectus Femoris", "Gastrocnemius", "Gluteus Maximus"], "Stationary Bike"),
    ("Elliptical", "time_based", ["Rectus Femoris", "Gluteus Maximus", "Anterior Deltoid", "Gastrocnemius"], "Elliptical"),
    ("Rowing Machine", "time_based", ["Lats", "Lower Traps", "Rectus Femoris", "Short Head Bicep"], "Rowing Machine"),
    ("Stair Climber", "time_based", ["Gluteus Maximus", "Rectus Femoris", "Gastrocnemius"], "Stair Climber"),
    ("Assault Bike", "time_based", ["Rectus Femoris", "Anterior Deltoid", "Gastrocnemius", "Upper Abdominals"], "Assault Bike"),
    ("Jump Rope", "time_based", ["Gastrocnemius", "Soleus", "Tibialis"], None),
    ("Battle Ropes", "time_based", ["Anterior Deltoid", "Lateral Deltoid", "Upper Abdominals", "Wrist Flexors"], "Battle Ropes"),
    ("Burpees", "time_based", ["Mid and Lower Chest", "Rectus Femoris", "Upper Abdominals", "Anterior Deltoid"], None),

    # ---- COMPOUND / FUNCTIONAL ----
    ("Kettlebell Swing", "sets_reps", ["Gluteus Maximus", "Medial Hamstrings", "Lateral Hamstrings", "Lower Back", "Upper Abdominals"], "Kettlebell"),
    ("Turkish Get-Up", "sets_reps", ["Anterior Deltoid", "Upper Abdominals", "Obliques", "Gluteus Maximus", "Rectus Femoris"], "Kettlebell"),
    ("Clean and Press", "sets_reps", ["Anterior Deltoid", "Upper Traps", "Rectus Femoris", "Gluteus Maximus", "Long Head Tricep"], "Barbell"),
    ("Farmer's Walk", "time_based", ["Wrist Flexors", "Wrist Extensors", "Upper Traps", "Upper Abdominals"], "Dumbbell"),
    ("Trap Bar Deadlift", "sets_reps", ["Lower Back", "Rectus Femoris", "Gluteus Maximus", "Upper Traps"], "Trap Bar"),
    ("Box Jumps", "sets_reps", ["Rectus Femoris", "Gluteus Maximus", "Gastrocnemius"], "Plyo Box"),
    ("Wall Sit", "time_based", ["Rectus Femoris", "Inner Quadriceps"], None),
    ("Body Weight Squat", "sets_reps", ["Rectus Femoris", "Inner Quadriceps", "Gluteus Maximus"], None),
    ("Inverted Row", "sets_reps", ["Lats", "Lower Traps", "Short Head Bicep", "Posterior Deltoid"], "Smith Machine"),
    ("TRX Row", "sets_reps", ["Lats", "Lower Traps", "Upper Abdominals", "Short Head Bicep"], "TRX / Suspension Trainer"),
]


def seed_all():
    with Session(engine) as session:
        # Seed equipment
        existing_equip = {e.name for e in session.exec(select(Equipment)).all()}
        equip_map = {}
        added_equip = 0

        # First pass: get existing equipment IDs
        for eq in session.exec(select(Equipment)).all():
            equip_map[eq.name] = eq.id

        for name, category in EQUIPMENT:
            if name not in existing_equip:
                eq = Equipment(name=name, category=category)
                session.add(eq)
                session.flush()
                equip_map[name] = eq.id
                added_equip += 1
            # else already in equip_map

        print(f"Equipment: {added_equip} added, {len(existing_equip)} already existed")

        # Seed exercises — update muscle_groups for existing exercises too
        existing_exercises = {e.name: e for e in session.exec(select(Exercise)).all()}
        added_ex = 0
        updated_ex = 0

        for name, ex_type, muscles, equip_name in EXERCISES:
            equipment_id = equip_map.get(equip_name) if equip_name else None
            if name in existing_exercises:
                ex = existing_exercises[name]
                if ex.muscle_groups != muscles:
                    ex.muscle_groups = muscles
                    session.add(ex)
                    updated_ex += 1
            else:
                ex = Exercise(
                    name=name,
                    exercise_type=ExerciseType(ex_type),
                    muscle_groups=muscles,
                    equipment_id=equipment_id,
                )
                session.add(ex)
                added_ex += 1

        session.commit()
        print(f"Exercises: {added_ex} added, {updated_ex} updated, {len(existing_exercises)} already existed")
        print(f"Total: {len(equip_map)} equipment, {len(existing_exercises) + added_ex} exercises")


if __name__ == "__main__":
    seed_all()
