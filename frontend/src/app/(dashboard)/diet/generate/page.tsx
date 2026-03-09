"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Loader2, Save, Utensils } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/auth-store";
import api from "@/lib/api";
import { toast } from "sonner";
import type { WorkoutPlan } from "@/types";

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

interface MealData {
  name: string;
  foods: string[];
  calories: number;
}

interface GeneratedDiet {
  title?: string;
  description?: string;
  ai_reasoning?: string;
  target_calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  meals?: Record<string, Record<string, MealData>>;
}

export default function GenerateDietPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [weight, setWeight] = useState(user?.weight_kg?.toString() || "");
  const [height, setHeight] = useState(user?.height_cm?.toString() || "");
  const [activityLevel, setActivityLevel] = useState("active");
  const [workoutPlanId, setWorkoutPlanId] = useState("");
  const [targetCalories, setTargetCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [mealsPerDay, setMealsPerDay] = useState("3");
  const [dietaryRestrictions, setDietaryRestrictions] = useState(
    user?.dietary_preferences?.join(", ") || "",
  );
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GeneratedDiet | null>(null);

  const { data: workoutPlans } = useQuery<WorkoutPlan[]>({
    queryKey: ["workout-plans"],
    queryFn: () => api.get("/api/workouts/plans").then((r) => r.data),
  });

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/api/ai/generate-diet", {
        current_weight: weight ? parseFloat(weight) : null,
        current_height: height ? parseFloat(height) : null,
        activity_level: activityLevel || null,
        workout_plan_id: workoutPlanId || null,
        target_calories: targetCalories ? parseInt(targetCalories) : null,
        protein_g: proteinG ? parseFloat(proteinG) : null,
        carbs_g: carbsG ? parseFloat(carbsG) : null,
        fat_g: fatG ? parseFloat(fatG) : null,
        meals_per_day: parseInt(mealsPerDay),
        dietary_restrictions: dietaryRestrictions || null,
        comments: comments || null,
      });
      setResult(data);
      toast.success("Weekly diet plan generated!");
    } catch {
      toast.error("Failed to generate diet plan.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await api.post("/api/diet-plans", {
        title: result.title || "AI Weekly Diet Plan",
        target_calories: result.target_calories ?? null,
        protein_g: result.protein_g ?? null,
        carbs_g: result.carbs_g ?? null,
        fat_g: result.fat_g ?? null,
        meals: result.meals || {},
        ai_reasoning: result.ai_reasoning ?? null,
        is_ai_generated: true,
      });
      queryClient.invalidateQueries({ queryKey: ["diet-plans"] });
      toast.success("Diet plan saved!");
      router.push("/diet");
    } catch {
      toast.error("Failed to save diet plan.");
    } finally {
      setSaving(false);
    }
  };

  const mealLabel = (key: string) =>
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const hasWeeklyMeals =
    result?.meals && Object.keys(result.meals).some((k) => /^\d$/.test(k));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generate AI Diet Plan</h1>
        <p className="text-muted-foreground">
          AI will create a personalized 7-day nutrition plan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Details</CardTitle>
          <CardDescription>
            Pre-filled from your profile. Adjust as needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 75"
              />
            </div>
            <div>
              <Label>Height (cm)</Label>
              <Input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g. 175"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Activity Level</Label>
              <Select value={activityLevel} onValueChange={setActivityLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary</SelectItem>
                  <SelectItem value="lightly_active">Lightly Active</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="very_active">Very Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Linked Workout Plan (optional)</Label>
              <Select value={workoutPlanId} onValueChange={(v) => setWorkoutPlanId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {workoutPlans?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Target Calories (optional)</Label>
              <Input
                type="number"
                value={targetCalories}
                onChange={(e) => setTargetCalories(e.target.value)}
                placeholder="e.g. 2500"
              />
            </div>
            <div>
              <Label>Meals per day</Label>
              <Input
                type="number"
                min={2}
                max={6}
                value={mealsPerDay}
                onChange={(e) => setMealsPerDay(e.target.value)}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Protein (g)</Label>
              <Input
                type="number"
                value={proteinG}
                onChange={(e) => setProteinG(e.target.value)}
                placeholder="optional"
              />
            </div>
            <div>
              <Label>Carbs (g)</Label>
              <Input
                type="number"
                value={carbsG}
                onChange={(e) => setCarbsG(e.target.value)}
                placeholder="optional"
              />
            </div>
            <div>
              <Label>Fat (g)</Label>
              <Input
                type="number"
                value={fatG}
                onChange={(e) => setFatG(e.target.value)}
                placeholder="optional"
              />
            </div>
          </div>

          <div>
            <Label>Dietary Restrictions</Label>
            <Input
              value={dietaryRestrictions}
              onChange={(e) => setDietaryRestrictions(e.target.value)}
              placeholder="e.g. vegetarian, gluten-free, no dairy..."
            />
          </div>

          <div>
            <Label>Additional Comments (optional)</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. I prefer high protein meals, meal prep friendly..."
              rows={2}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Generate Weekly Diet Plan
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{result.title || "Generated Plan"}</CardTitle>
                {result.description && (
                  <CardDescription>{result.description}</CardDescription>
                )}
              </div>
              {hasWeeklyMeals && (
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Plan
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.ai_reasoning && (
              <p className="text-sm text-muted-foreground italic">
                {result.ai_reasoning}
              </p>
            )}

            {(result.target_calories || result.protein_g) && (
              <div className="flex flex-wrap gap-3">
                {result.target_calories && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {result.target_calories} kcal/day
                  </Badge>
                )}
                {result.protein_g && (
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    Protein: {result.protein_g}g
                  </Badge>
                )}
                {result.carbs_g && (
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    Carbs: {result.carbs_g}g
                  </Badge>
                )}
                {result.fat_g && (
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    Fat: {result.fat_g}g
                  </Badge>
                )}
              </div>
            )}

            {hasWeeklyMeals ? (
              <Tabs defaultValue="0">
                <TabsList className="w-full grid grid-cols-7">
                  {DAY_NAMES.map((name, i) => (
                    <TabsTrigger key={i} value={String(i)}>
                      {name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const dayMeals = (result.meals?.[String(dayIndex)] || {}) as Record<string, MealData>;

                  return (
                    <TabsContent
                      key={dayIndex}
                      value={String(dayIndex)}
                      className="space-y-3"
                    >
                      <h3 className="text-lg font-semibold">
                        {DAY_FULL[dayIndex]}
                      </h3>

                      {Object.entries(dayMeals).map(([key, meal]) => (
                        <div
                          key={key}
                          className="rounded-lg border px-4 py-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Utensils className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {mealLabel(key)}
                              </span>
                            </div>
                            {meal.calories && (
                              <span className="text-sm text-muted-foreground">
                                {meal.calories} kcal
                              </span>
                            )}
                          </div>
                          {meal.name && meal.name !== mealLabel(key) && (
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              {meal.name}
                            </p>
                          )}
                          {meal.foods?.length > 0 && (
                            <ul className="text-sm text-muted-foreground space-y-0.5">
                              {meal.foods.map((food, i) => (
                                <li key={i}>- {food}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}

                      {Object.keys(dayMeals).length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No meals for this day.
                        </p>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            ) : (
              <pre className="overflow-auto rounded bg-muted p-4 text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
