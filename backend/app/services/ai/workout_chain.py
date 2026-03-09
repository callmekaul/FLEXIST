import json

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.config import settings

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

SYSTEM_PROMPT = """\
You are a certified personal trainer creating weekly workout plans. Given user details, \
generate a structured 7-day workout plan using ONLY exercises from the provided exercise catalog.

Rules:
- Create a plan for the specified number of training days, mark remaining days as rest
- Use exercise IDs exactly as provided in the catalog
- Pick 5-8 exercises per training day, appropriate for that day's focus
- Structure the week with proper muscle group splits (avoid training same muscles on consecutive days)
- For sets_reps exercises: set realistic target_sets (3-5), target_reps (6-15), target_weight_kg based on experience
- For time_based exercises: set target_duration_seconds (120-1800), target_distance_km if applicable
- Set rest_seconds between 30-120 based on exercise intensity
- Include brief helpful notes for each exercise
- Provide ai_reasoning explaining the weekly split strategy

Respond with valid JSON only, no markdown formatting."""

USER_PROMPT = """\
User Profile:
- Weight: {weight_kg} kg
- Height: {height_cm} cm
- Goals: {goals}
- Days per week available: {days_per_week}
- Skill Level: {skill_level}
- Additional Comments: {comments}

Available Exercises (use only these):
{exercise_catalog}

Generate a weekly workout plan as JSON with this structure:
{{
  "title": "string",
  "description": "string",
  "ai_reasoning": "string explaining the weekly split strategy",
  "days": {{
    "0": {{
      "label": "Push Day" or "Rest Day" etc,
      "exercises": [
        {{
          "exercise_id": "uuid from catalog",
          "exercise_name": "name from catalog",
          "exercise_type": "sets_reps or time_based",
          "muscle_groups": ["from catalog"],
          "order": 1,
          "target_sets": null or int,
          "target_reps": null or int,
          "target_weight_kg": null or float,
          "target_duration_seconds": null or int,
          "target_distance_km": null or float,
          "rest_seconds": int,
          "notes": "brief tip"
        }}
      ]
    }},
    "1": {{ ... }},
    ...
    "6": {{ ... }}
  }}
}}

Days 0-6 represent Monday through Sunday. For rest days, set exercises to an empty array."""


def build_exercise_catalog(exercises: list) -> str:
    catalog = []
    for ex in exercises:
        entry = {
            "id": str(ex.id),
            "name": ex.name,
            "type": ex.exercise_type.value if hasattr(ex.exercise_type, "value") else ex.exercise_type,
            "muscle_groups": ex.muscle_groups or [],
        }
        catalog.append(entry)
    return json.dumps(catalog, indent=2)


async def generate_workout_plan(
    user,
    req,
    exercises: list,
) -> dict:
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.openai_api_key,
        temperature=0.7,
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", USER_PROMPT),
    ])

    chain = prompt | llm

    result = await chain.ainvoke({
        "weight_kg": req.current_weight or user.weight_kg or "Unknown",
        "height_cm": req.current_height or user.height_cm or "Unknown",
        "goals": req.goals or (", ".join(user.fitness_goals) if user.fitness_goals else "General fitness"),
        "days_per_week": req.days_per_week,
        "skill_level": req.skill_level or (
            user.experience_level.value
            if user.experience_level and hasattr(user.experience_level, "value")
            else "beginner"
        ),
        "comments": req.comments or "None",
        "exercise_catalog": build_exercise_catalog(exercises),
    })

    content = result.content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    return json.loads(content)
