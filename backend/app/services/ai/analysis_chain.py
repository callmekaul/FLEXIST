import json

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.config import settings

SYSTEM_PROMPT = """\
You are a sports science analyst reviewing a user's workout history and body measurements. \
Analyze their training data and provide actionable insights, trends, and recommendations.

Rules:
- Identify training patterns (frequency, volume, intensity)
- Note any muscle group imbalances
- Highlight personal records and improvements
- Analyze body measurement trends (weight, circumferences)
- If the user mentions injuries, factor them into recommendations
- Suggest areas for improvement
- Keep recommendations practical and specific
- Be encouraging but honest

Respond with valid JSON only, no markdown formatting."""

USER_PROMPT = """\
User Profile:
- Age: {age}
- Weight: {weight_kg} kg
- Height: {height_cm} cm
- Experience: {experience_level}
- Fitness Goals: {fitness_goals}

Current Injuries/Limitations: {injuries}

Workout History (last {weeks} weeks):
{workout_summary}

Body Measurements Trend:
{measurement_summary}

Analyze this data and respond with JSON:
{{
  "summary": "2-3 sentence overview of training performance",
  "workouts_completed": int,
  "avg_duration_minutes": float or null,
  "most_trained_muscles": ["muscle group"],
  "least_trained_muscles": ["muscle group"],
  "strengths": ["specific strength observation"],
  "areas_for_improvement": ["specific improvement suggestion"],
  "recommendations": ["actionable recommendation"],
  "measurement_trends": "brief analysis of body measurement changes over the period",
  "injury_considerations": "advice related to reported injuries, or null if none reported",
  "motivation": "short encouraging message"
}}"""


def format_workout_summary(logs: list, exercise_logs: list) -> str:
    if not logs:
        return "No workouts logged in this period."

    lines = []
    for log in logs:
        date = log.started_at.strftime("%Y-%m-%d")
        duration = ""
        if log.completed_at:
            mins = (log.completed_at - log.started_at).total_seconds() / 60
            duration = f" ({mins:.0f} min)"
        rating = f" [Rating: {log.rating}/5]" if log.rating else ""

        exercises_for_log = [el for el in exercise_logs if el.workout_log_id == log.id]
        exercise_names = set()
        for el in exercises_for_log:
            name = getattr(el, "_exercise_name", None) or str(el.exercise_id)[:8]
            exercise_names.add(name)

        ex_str = ", ".join(exercise_names) if exercise_names else "no exercises"
        lines.append(f"- {date}{duration}{rating}: {ex_str}")

    return "\n".join(lines)


def format_measurement_summary(measurements: list) -> str:
    if not measurements:
        return "No body measurements recorded."

    lines = []
    for m in measurements:
        date = m.measured_at.strftime("%Y-%m-%d")
        parts = []
        if m.weight_kg is not None:
            parts.append(f"Weight: {m.weight_kg}kg")
        if m.height_cm is not None:
            parts.append(f"Height: {m.height_cm}cm")
        if m.bicep_cm is not None:
            parts.append(f"Bicep: {m.bicep_cm}cm")
        if m.chest_cm is not None:
            parts.append(f"Chest: {m.chest_cm}cm")
        if m.waist_cm is not None:
            parts.append(f"Waist: {m.waist_cm}cm")
        if m.hip_cm is not None:
            parts.append(f"Hip: {m.hip_cm}cm")
        if m.thigh_cm is not None:
            parts.append(f"Thigh: {m.thigh_cm}cm")
        if m.calf_cm is not None:
            parts.append(f"Calf: {m.calf_cm}cm")
        if m.forearm_cm is not None:
            parts.append(f"Forearm: {m.forearm_cm}cm")
        if m.neck_cm is not None:
            parts.append(f"Neck: {m.neck_cm}cm")
        lines.append(f"- {date}: {', '.join(parts)}")

    return "\n".join(lines)


async def analyze_progress(
    user,
    logs: list,
    exercise_logs: list,
    measurements: list,
    weeks: int = 4,
    injuries: str | None = None,
) -> dict:
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.openai_api_key,
        temperature=0.5,
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", USER_PROMPT),
    ])

    chain = prompt | llm

    result = await chain.ainvoke({
        "age": user.age or "Unknown",
        "weight_kg": user.weight_kg or "Unknown",
        "height_cm": user.height_cm or "Unknown",
        "experience_level": (
            user.experience_level.value
            if user.experience_level and hasattr(user.experience_level, "value")
            else user.experience_level or "beginner"
        ),
        "fitness_goals": ", ".join(user.fitness_goals) if user.fitness_goals else "General fitness",
        "injuries": injuries or "None reported",
        "weeks": weeks,
        "workout_summary": format_workout_summary(logs, exercise_logs),
        "measurement_summary": format_measurement_summary(measurements),
    })

    content = result.content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    return json.loads(content)
