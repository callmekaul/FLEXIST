"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Trash2, Clock, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { localISOString } from "@/lib/utils";
import { toast } from "sonner";
import { MuscleMap, calculateMuscleIntensity } from "@/components/workout/muscle-map";
import { useAuthStore } from "@/stores/auth-store";
import type { WorkoutPlan, WorkoutPlanExercise } from "@/types";

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

export default function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeDay, setActiveDay] = useState("0");

  const { data: plan, isLoading: planLoading, isError: planError } = useQuery<WorkoutPlan>({
    queryKey: ["workout-plan", planId],
    queryFn: () => api.get(`/api/workouts/plans/${planId}`).then((r) => r.data),
  });

  const { data: exercises } = useQuery<WorkoutPlanExercise[]>({
    queryKey: ["plan-exercises", planId],
    queryFn: () =>
      api.get(`/api/workouts/plans/${planId}/exercises`).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/workouts/plans/${planId}`),
    onSuccess: () => {
      toast.success("Plan deleted.");
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      router.push("/workouts");
    },
  });

  // Group exercises by day
  const exercisesByDay = useMemo(() => {
    const grouped: Record<number, WorkoutPlanExercise[]> = {};
    for (let i = 0; i < 7; i++) grouped[i] = [];
    exercises?.forEach((ex) => {
      const day = ex.day_of_week ?? 0;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(ex);
    });
    return grouped;
  }, [exercises]);

  const dayMuscles = useMemo(
    () => calculateMuscleIntensity(exercisesByDay[parseInt(activeDay)] || []),
    [exercisesByDay, activeDay],
  );

  const logWorkoutForDay = async (dayOfWeek: number) => {
    try {
      const { data: log } = await api.post("/api/workouts/logs", {
        plan_id: planId,
        day_of_week: dayOfWeek,
        started_at: localISOString(),
      });
      router.push(`/workouts/active/${log.id}`);
    } catch {
      toast.error("Failed to start workout.");
    }
  };

  if (planLoading) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Loading plan...</p></div>;
  if (planError || !plan) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Plan not found.</p></div>;

  const trainingDays = Object.entries(exercisesByDay).filter(
    ([, exs]) => exs.length > 0,
  ).length;

  const isFemale = user?.gender?.toLowerCase() === "female";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{plan.title}</h1>
          {plan.description && (
            <p className="text-muted-foreground">{plan.description}</p>
          )}
          <div className="mt-1 flex gap-2">
            {plan.is_ai_generated && (
              <Badge variant="secondary">AI Generated</Badge>
            )}
            <Badge variant="outline">
              {trainingDays} training day{trainingDays !== 1 ? "s" : ""} / week
            </Badge>
          </div>
        </div>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => deleteMutation.mutate()}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {plan.ai_reasoning && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Reasoning</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{plan.ai_reasoning}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <Tabs value={activeDay} onValueChange={setActiveDay}>
            <TabsList className="w-full grid grid-cols-7">
              {DAY_NAMES.map((name, i) => (
                <TabsTrigger key={i} value={String(i)} className="relative">
                  {name}
                  {exercisesByDay[i].length > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {Array.from({ length: 7 }, (_, dayIndex) => {
              const dayExs = exercisesByDay[dayIndex];
              const isRestDay = dayExs.length === 0;

              return (
                <TabsContent
                  key={dayIndex}
                  value={String(dayIndex)}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                      {DAY_FULL[dayIndex]}
                      {isRestDay && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          — Rest Day
                        </span>
                      )}
                    </h2>
                    {!isRestDay && (
                      <Button onClick={() => logWorkoutForDay(dayIndex)}>
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Log Workout
                      </Button>
                    )}
                  </div>

                  {dayExs.map((ex, i) => (
                    <Card key={ex.id}>
                      <CardContent className="flex items-center gap-4 py-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{ex.exercise_name}</p>
                          {ex.muscle_groups?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {ex.muscle_groups.map((mg) => (
                                <Badge
                                  key={mg}
                                  variant="secondary"
                                  className="text-xs capitalize px-1.5 py-0"
                                >
                                  {mg}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            {ex.exercise_type === "sets_reps" ? (
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
                                    {Math.floor(ex.target_duration_seconds / 60)}m
                                    {ex.target_duration_seconds % 60 > 0 &&
                                      ` ${ex.target_duration_seconds % 60}s`}
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
                          {ex.exercise_type === "sets_reps" ? "Sets/Reps" : "Time"}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>

        {Object.keys(dayMuscles).length > 0 && (
          <Card className="h-fit lg:w-sm shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Muscles Targeted — {DAY_FULL[parseInt(activeDay)]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MuscleMap muscles={dayMuscles} female={isFemale} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
