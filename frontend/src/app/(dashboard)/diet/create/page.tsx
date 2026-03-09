"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { toast } from "sonner";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DEFAULT_MEAL_KEYS = ["breakfast", "lunch", "dinner"];

interface MealEntry {
  key: string;
  name: string;
  foods: string[];
  calories: string;
}

type WeekMeals = Record<number, MealEntry[]>;

function mealLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CreateDietPlanPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [targetCalories, setTargetCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [activeDay, setActiveDay] = useState("0");
  const [saving, setSaving] = useState(false);

  const [weekMeals, setWeekMeals] = useState<WeekMeals>(
    Object.fromEntries(
      Array.from({ length: 7 }, (_, i) => [
        i,
        DEFAULT_MEAL_KEYS.map((key) => ({
          key,
          name: "",
          foods: [""],
          calories: "",
        })),
      ]),
    ),
  );

  const dayIdx = parseInt(activeDay);
  const dayMeals = weekMeals[dayIdx] || [];

  const setDayMeals = (day: number, meals: MealEntry[]) => {
    setWeekMeals((prev) => ({ ...prev, [day]: meals }));
  };

  const updateMeal = (
    mealIdx: number,
    field: "name" | "calories",
    value: string,
  ) => {
    setDayMeals(
      dayIdx,
      dayMeals.map((m, i) => (i === mealIdx ? { ...m, [field]: value } : m)),
    );
  };

  const updateFood = (mealIdx: number, foodIdx: number, value: string) => {
    setDayMeals(
      dayIdx,
      dayMeals.map((m, i) =>
        i === mealIdx
          ? { ...m, foods: m.foods.map((f, j) => (j === foodIdx ? value : f)) }
          : m,
      ),
    );
  };

  const addFood = (mealIdx: number) => {
    setDayMeals(
      dayIdx,
      dayMeals.map((m, i) =>
        i === mealIdx ? { ...m, foods: [...m.foods, ""] } : m,
      ),
    );
  };

  const removeFood = (mealIdx: number, foodIdx: number) => {
    setDayMeals(
      dayIdx,
      dayMeals.map((m, i) =>
        i === mealIdx
          ? { ...m, foods: m.foods.filter((_, j) => j !== foodIdx) }
          : m,
      ),
    );
  };

  const addMeal = () => {
    const newKey = `meal_${dayMeals.length + 1}`;
    setDayMeals(dayIdx, [
      ...dayMeals,
      { key: newKey, name: "", foods: [""], calories: "" },
    ]);
  };

  const removeMeal = (mealIdx: number) => {
    setDayMeals(
      dayIdx,
      dayMeals.filter((_, i) => i !== mealIdx),
    );
  };

  const updateMealKey = (mealIdx: number, newKey: string) => {
    setDayMeals(
      dayIdx,
      dayMeals.map((m, i) => (i === mealIdx ? { ...m, key: newKey } : m)),
    );
  };

  const copyDayTo = (targetDay: number) => {
    const copied = dayMeals.map((m) => ({
      ...m,
      foods: [...m.foods],
    }));
    setDayMeals(targetDay, copied);
    toast.success(`Copied ${DAY_FULL[dayIdx]} meals to ${DAY_FULL[targetDay]}`);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Plan title is required.");
      return;
    }

    // Build meals JSON in day-keyed format
    const meals: Record<string, Record<string, { name: string; foods: string[]; calories: number }>> = {};
    for (const [day, entries] of Object.entries(weekMeals)) {
      const dayObj: Record<string, { name: string; foods: string[]; calories: number }> = {};
      for (const entry of entries as MealEntry[]) {
        const foods = entry.foods.filter((f) => f.trim());
        if (foods.length === 0 && !entry.name.trim()) continue;
        dayObj[entry.key] = {
          name: entry.name.trim() || mealLabel(entry.key),
          foods,
          calories: entry.calories ? parseInt(entry.calories) : 0,
        };
      }
      if (Object.keys(dayObj).length > 0) {
        meals[day] = dayObj;
      }
    }

    if (Object.keys(meals).length === 0) {
      toast.error("Add meals to at least one day.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/diet-plans", {
        title: title.trim(),
        target_calories: targetCalories ? parseInt(targetCalories) : null,
        protein_g: proteinG ? parseFloat(proteinG) : null,
        carbs_g: carbsG ? parseFloat(carbsG) : null,
        fat_g: fatG ? parseFloat(fatG) : null,
        meals,
      });
      toast.success("Diet plan created!");
      router.push("/diet");
    } catch {
      toast.error("Failed to create diet plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Create Diet Plan</h1>
        <p className="text-muted-foreground">
          Build a 7-day meal plan. Add meals per day with foods and calorie
          targets.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input
            placeholder="e.g. High Protein Cut, Bulking Plan..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Target Calories</Label>
            <Input
              type="number"
              placeholder="e.g. 2500"
              value={targetCalories}
              onChange={(e) => setTargetCalories(e.target.value)}
            />
          </div>
          <div>
            <Label>Protein (g)</Label>
            <Input
              type="number"
              placeholder="optional"
              value={proteinG}
              onChange={(e) => setProteinG(e.target.value)}
            />
          </div>
          <div>
            <Label>Carbs (g)</Label>
            <Input
              type="number"
              placeholder="optional"
              value={carbsG}
              onChange={(e) => setCarbsG(e.target.value)}
            />
          </div>
          <div>
            <Label>Fat (g)</Label>
            <Input
              type="number"
              placeholder="optional"
              value={fatG}
              onChange={(e) => setFatG(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Tabs value={activeDay} onValueChange={setActiveDay}>
        <TabsList className="w-full grid grid-cols-7">
          {DAY_NAMES.map((name, i) => (
            <TabsTrigger key={i} value={String(i)} className="relative">
              {name}
              {(weekMeals[i]?.some((m) =>
                m.foods.some((f) => f.trim()),
              ) ?? false) && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {Array.from({ length: 7 }, (_, dayIndex) => (
          <TabsContent
            key={dayIndex}
            value={String(dayIndex)}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{DAY_FULL[dayIndex]}</h2>
              {dayIndex === dayIdx && dayMeals.some((m) => m.foods.some((f) => f.trim())) && (
                <div className="flex gap-1 flex-wrap">
                  {DAY_NAMES.map((name, i) =>
                    i !== dayIdx ? (
                      <Button
                        key={i}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => copyDayTo(i)}
                        title={`Copy to ${DAY_FULL[i]}`}
                      >
                        {name}
                      </Button>
                    ) : null,
                  )}
                </div>
              )}
            </div>

            {dayIndex === dayIdx && (
              <>
                {dayMeals.map((meal, mealIdx) => (
                  <Card key={mealIdx}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={meal.key}
                            onChange={(e) =>
                              updateMealKey(
                                mealIdx,
                                e.target.value
                                  .toLowerCase()
                                  .replace(/\s+/g, "_"),
                              )
                            }
                            className="w-40 text-sm font-medium"
                            placeholder="meal key"
                          />
                          <Input
                            value={meal.name}
                            onChange={(e) =>
                              updateMeal(mealIdx, "name", e.target.value)
                            }
                            placeholder="Meal name (e.g. Greek Yogurt Bowl)"
                            className="flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={meal.calories}
                              onChange={(e) =>
                                updateMeal(mealIdx, "calories", e.target.value)
                              }
                              placeholder="kcal"
                              className="w-20"
                            />
                            <span className="text-xs text-muted-foreground">
                              kcal
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeMeal(mealIdx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Label className="text-xs">Foods</Label>
                      {meal.foods.map((food, foodIdx) => (
                        <div key={foodIdx} className="flex gap-2">
                          <Input
                            value={food}
                            onChange={(e) =>
                              updateFood(mealIdx, foodIdx, e.target.value)
                            }
                            placeholder="e.g. 200g chicken breast"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => removeFood(mealIdx, foodIdx)}
                            disabled={meal.foods.length <= 1}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addFood(mealIdx)}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add Food
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  onClick={addMeal}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Meal
                </Button>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Plan
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
