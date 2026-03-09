"""Serialize workout/exercise data into LLM-friendly text format."""

from app.models.exercise import Exercise, ExerciseType
from app.models.workout import ExerciseLog, WorkoutLog


def serialize_exercise_logs(
    logs: list[ExerciseLog],
    exercises: dict[str, Exercise],
) -> str:
    """Convert exercise log entries into a compact text representation.

    Groups by exercise, then formats based on exercise type.
    `exercises` is a dict mapping exercise_id (str) -> Exercise.
    """
    grouped: dict[str, list[ExerciseLog]] = {}
    for log in logs:
        key = str(log.exercise_id)
        grouped.setdefault(key, []).append(log)

    lines = []
    for eid, entries in grouped.items():
        exercise = exercises.get(eid)
        name = exercise.name if exercise else "Unknown"
        etype = entries[0].exercise_type
        order = entries[0].order

        if etype == ExerciseType.SETS_REPS:
            sets_str = " | ".join(
                f"Set {e.set_number}: {e.reps} reps @ {e.weight_kg}kg"
                + (" (PR!)" if e.is_personal_record else "")
                for e in sorted(entries, key=lambda x: x.set_number or 0)
            )
            lines.append((order, f"{name} [sets_reps]: {sets_str}"))
        else:
            for e in entries:
                parts = []
                if e.duration_seconds:
                    mins = e.duration_seconds // 60
                    secs = e.duration_seconds % 60
                    parts.append(f"{mins} minutes" if mins else f"{secs} seconds")
                if e.distance_km:
                    parts.append(f"{e.distance_km} km")
                desc = ", ".join(parts) if parts else "completed"
                pr = " (PR!)" if e.is_personal_record else ""
                lines.append((order, f"{name} [time_based]: {desc}{pr}"))

    lines.sort(key=lambda x: x[0])
    return "\n".join(f"{i+1}. {line}" for i, (_, line) in enumerate(lines))


def serialize_workout_log(
    workout: WorkoutLog,
    exercise_logs: list[ExerciseLog],
    exercises: dict[str, Exercise],
) -> str:
    """Serialize a full workout session for LLM context."""
    duration = ""
    if workout.completed_at and workout.started_at:
        mins = int((workout.completed_at - workout.started_at).total_seconds() / 60)
        duration = f", {mins} min"

    rating = f", Rating: {workout.rating}/5" if workout.rating else ""
    date_str = workout.started_at.strftime("%B %d, %Y")
    header = f"=== Workout: {date_str} ({duration.strip(', ')}{rating}) ==="

    exercises_text = serialize_exercise_logs(exercise_logs, exercises)
    return f"{header}\n{exercises_text}"
