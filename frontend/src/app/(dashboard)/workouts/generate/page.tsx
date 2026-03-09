"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Brain, Loader2, Save, Clock, Dumbbell } from "lucide-react";
import { MuscleMap, calculateMuscleIntensity } from "@/components/workout/muscle-map";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/auth-store";
import { useGymStore } from "@/stores/gym-store";
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

interface GeneratedExercise {
  exercise_id: string;
  exercise_name?: string;
  exercise_type?: string;
  muscle_groups?: string[];
  order: number;
  target_sets?: number | null;
  target_reps?: number | null;
  target_weight_kg?: number | null;
  target_duration_seconds?: number | null;
  target_distance_km?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
}

interface GeneratedDay {
  label?: string;
  exercises: GeneratedExercise[];
}

interface GeneratedPlan {
  title?: string;
  description?: string;
  ai_reasoning?: string;
  days?: Record<string, GeneratedDay>;
}

export default function GenerateWorkoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentGym } = useGymStore();

  const [weight, setWeight] = useState(user?.weight_kg?.toString() || "");
  const [height, setHeight] = useState(user?.height_cm?.toString() || "");
  const [goals, setGoals] = useState(user?.fitness_goals?.join(", ") || "");
  const [daysPerWeek, setDaysPerWeek] = useState("5");
  const [skillLevel, setSkillLevel] = useState<string>(
    user?.experience_level || "beginner",
  );
  const [comments, setComments] = useState("");
  const [tailorToGym, setTailorToGym] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GeneratedPlan | null>(null);
  const [activeDay, setActiveDay] = useState("0");

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/api/ai/generate-workout", {
        current_weight: weight ? parseFloat(weight) : null,
        current_height: height ? parseFloat(height) : null,
        goals: goals || null,
        days_per_week: parseInt(daysPerWeek),
        skill_level: skillLevel,
        comments: comments || null,
        tailor_to_gym: tailorToGym,
      });
      setResult(data);
      toast.success("Weekly workout plan generated!");
    } catch {
      toast.error("Failed to generate workout. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result?.days) return;
    setSaving(true);
    try {
      const exercises = Object.entries(result.days).flatMap(
        ([dayKey, day]) =>
          (day.exercises || []).map((ex, i) => ({
            exercise_id: ex.exercise_id,
            day_of_week: parseInt(dayKey),
            order: ex.order ?? i + 1,
            target_sets: ex.target_sets ?? null,
            target_reps: ex.target_reps ?? null,
            target_weight_kg: ex.target_weight_kg ?? null,
            target_duration_seconds: ex.target_duration_seconds ?? null,
            target_distance_km: ex.target_distance_km ?? null,
            rest_seconds: ex.rest_seconds ?? null,
            notes: ex.notes ?? null,
          })),
      );

      const payload = {
        title: result.title || "AI Weekly Workout",
        description: result.description || null,
        is_ai_generated: true,
        ai_reasoning: result.ai_reasoning || null,
        exercises,
      };

      const { data: plan } = await api.post("/api/workouts/plans", payload);
      toast.success("Plan saved!");
      router.push(`/workouts/${plan.id}`);
    } catch {
      toast.error("Failed to save plan.");
    } finally {
      setSaving(false);
    }
  };

  const hasResult = result?.days && Object.keys(result.days).length > 0;

  const dayMuscles = useMemo(() => {
    if (!result?.days) return {};
    const day = result.days[activeDay];
    return calculateMuscleIntensity(day?.exercises || []);
  }, [result, activeDay]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generate AI Workout</h1>
        <p className="text-muted-foreground">
          AI will create a personalized 7-day workout plan based on your profile.
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

          <div>
            <Label>Goals</Label>
            <Input
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g. Build muscle, lose fat, improve endurance"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Days per week</Label>
              <Input
                type="number"
                min={1}
                max={7}
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(e.target.value)}
              />
            </div>
            <div>
              <Label>Skill Level</Label>
              <Select value={skillLevel} onValueChange={setSkillLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Additional Comments (optional)</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. I have a shoulder injury, prefer free weights..."
              rows={2}
            />
          </div>

          {currentGym && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="tailor-gym"
                checked={tailorToGym}
                onCheckedChange={(v) => setTailorToGym(v === true)}
              />
              <Label htmlFor="tailor-gym" className="text-sm font-normal cursor-pointer">
                Tailor to my gym ({currentGym.name}) — only use equipment available there
              </Label>
            </div>
          )}

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
                Generate Weekly Plan
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
              {hasResult && (
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save as Plan
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

            {hasResult ? (
              <>
              <Tabs value={activeDay} onValueChange={setActiveDay}>
                <TabsList className="w-full grid grid-cols-7">
                  {DAY_NAMES.map((name, i) => (
                    <TabsTrigger key={i} value={String(i)} className="relative">
                      {name}
                      {(result.days?.[String(i)]?.exercises?.length ?? 0) >
                        0 && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const day = result.days?.[String(dayIndex)];
                  const dayExs = day?.exercises || [];
                  const isRestDay = dayExs.length === 0;

                  return (
                    <TabsContent
                      key={dayIndex}
                      value={String(dayIndex)}
                      className="space-y-3"
                    >
                      <h3 className="text-lg font-semibold">
                        {DAY_FULL[dayIndex]}
                        {day?.label && (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            — {day.label}
                          </span>
                        )}
                        {isRestDay && !day?.label && (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            — Rest Day
                          </span>
                        )}
                      </h3>

                      {dayExs.map((ex, i) => {
                        const name = ex.exercise_name || "Exercise";
                        const type = ex.exercise_type || "sets_reps";
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-4 rounded-lg border px-4 py-3"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{name}</p>
                              {ex.muscle_groups && ex.muscle_groups.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {ex.muscle_groups.map((mg) => (
                                    <Badge
                                      key={mg}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {mg}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-1">
                                {type === "sets_reps" ? (
                                  <>
                                    {ex.target_sets && ex.target_reps && (
                                      <span className="flex items-center gap-1">
                                        <Dumbbell className="h-3 w-3" />
                                        {ex.target_sets} x {ex.target_reps}
                                      </span>
                                    )}
                                    {ex.target_weight_kg && (
                                      <span>@ {ex.target_weight_kg}kg</span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {ex.target_duration_seconds && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {Math.round(
                                          ex.target_duration_seconds / 60,
                                        )}
                                        m
                                      </span>
                                    )}
                                    {ex.target_distance_km && (
                                      <span>{ex.target_distance_km}km</span>
                                    )}
                                  </>
                                )}
                                {ex.rest_seconds && (
                                  <span>Rest: {ex.rest_seconds}s</span>
                                )}
                              </div>
                              {ex.notes && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {ex.notes}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline">
                              {type === "sets_reps" ? "Sets/Reps" : "Time"}
                            </Badge>
                          </div>
                        );
                      })}
                    </TabsContent>
                  );
                })}
              </Tabs>

              {Object.keys(dayMuscles).length > 0 && (
                <div className="mt-4 rounded-lg border p-4">
                  <h4 className="text-sm font-medium mb-2">
                    Muscles Targeted — {DAY_FULL[parseInt(activeDay)]}
                  </h4>
                  <MuscleMap muscles={dayMuscles} female={user?.gender?.toLowerCase() === "female"} />
                </div>
              )}
            </>
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
