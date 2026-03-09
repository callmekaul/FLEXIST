import json

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.config import settings

SYSTEM_PROMPT = """\
You are a certified nutritionist creating personalized 7-day meal plans. Given user details and preferences, \
generate a structured weekly meal plan with daily macronutrient targets.

Rules:
- Calculate appropriate daily calorie target based on user profile and goals
- Break down macros: protein, carbs, fat in grams
- Create meals for each day based on the requested meals_per_day (typically 3-5)
- Each meal should have: name, foods list with portions, and approximate calories
- Respect dietary restrictions (vegetarian, vegan, gluten-free, etc.)
- Vary meals across the week for nutritional diversity
- If a workout plan context is provided, align nutrition to training days vs rest days
- Provide a clear title and description
- Provide ai_reasoning explaining your nutritional strategy

Respond with valid JSON only, no markdown formatting."""

USER_PROMPT = """\
User Profile:
- Weight: {weight_kg} kg
- Height: {height_cm} cm
- Goals: {goals}
- Activity Level: {activity_level}
- Dietary Restrictions: {dietary_restrictions}

Macro Targets (if specified):
- Target Calories: {target_calories}
- Protein: {protein_g}g
- Carbs: {carbs_g}g
- Fat: {fat_g}g

Meals per day: {meals_per_day}
Additional Comments: {comments}

Generate a 7-day meal plan as JSON with this structure:
{{
  "title": "string",
  "description": "string",
  "ai_reasoning": "string explaining the nutritional strategy",
  "target_calories": int,
  "protein_g": float,
  "carbs_g": float,
  "fat_g": float,
  "meals": {{
    "0": {{
      "breakfast": {{
        "name": "string",
        "foods": ["food item with portion"],
        "calories": int
      }},
      "lunch": {{
        "name": "string",
        "foods": ["food item with portion"],
        "calories": int
      }},
      "dinner": {{
        "name": "string",
        "foods": ["food item with portion"],
        "calories": int
      }}
    }},
    "1": {{ ... }},
    ...
    "6": {{ ... }}
  }}
}}

Days 0-6 represent Monday through Sunday. Include {meals_per_day} meals per day \
(e.g., breakfast, morning_snack, lunch, afternoon_snack, dinner). \
Adjust meal names based on the number of meals."""


async def generate_diet_plan(user, req) -> dict:
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
        "goals": ", ".join(user.fitness_goals) if user.fitness_goals else "General fitness",
        "activity_level": req.activity_level or "moderately active",
        "dietary_restrictions": req.dietary_restrictions or (
            ", ".join(user.dietary_preferences) if user.dietary_preferences else "None"
        ),
        "target_calories": req.target_calories or "Calculate based on profile",
        "protein_g": req.protein_g or "Calculate based on profile",
        "carbs_g": req.carbs_g or "Calculate based on profile",
        "fat_g": req.fat_g or "Calculate based on profile",
        "meals_per_day": req.meals_per_day,
        "comments": req.comments or "None",
    })

    content = result.content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    return json.loads(content)
