"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Loader2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { toast } from "sonner";
import type { Exercise } from "@/types";

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

interface PlanExerciseEntry {
  exercise_id: string;
  exercise_name: string;
  exercise_type: "sets_reps" | "time_based";
  muscle_groups: string[];
  order: number;
  target_sets: number;
  target_reps: number;
  target_weight_kg: number;
  target_duration_seconds: number;
  target_distance_km: number;
  rest_seconds: number;
  notes: string;
}

type WeekExercises = Record<number, PlanExerciseEntry[]>;

export default function CreatePlanPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [weekExercises, setWeekExercises] = useState<WeekExercises>(
    Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i, []])),
  );
  const [activeDay, setActiveDay] = useState("0");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: searchResults } = useQuery<Exercise[]>({
    queryKey: ["exercises", searchQuery],
    queryFn: () =>
      api
        .get("/api/exercises", { params: { search: searchQuery, limit: 20 } })
        .then((r) => r.data),
    enabled: showSearch,
  });

  const dayIdx = parseInt(activeDay);
  const dayExercises = weekExercises[dayIdx] || [];

  const setDayExercises = (day: number, exercises: PlanExerciseEntry[]) => {
    setWeekExercises((prev) => ({ ...prev, [day]: exercises }));
  };

  const addExercise = (exercise: Exercise) => {
    if (dayExercises.some((e) => e.exercise_id === exercise.id)) {
      toast.error("Exercise already added for this day.");
      return;
    }
    setDayExercises(dayIdx, [
      ...dayExercises,
      {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        exercise_type: exercise.exercise_type,
        muscle_groups: exercise.muscle_groups || [],
        order: dayExercises.length + 1,
        target_sets: exercise.exercise_type === "sets_reps" ? 3 : 0,
        target_reps: exercise.exercise_type === "sets_reps" ? 10 : 0,
        target_weight_kg: 0,
        target_duration_seconds: exercise.exercise_type === "time_based" ? 300 : 0,
        target_distance_km: 0,
        rest_seconds: 60,
        notes: "",
      },
    ]);
    setShowSearch(false);
    setSearchQuery("");
  };

  const removeExercise = (idx: number) => {
    setDayExercises(
      dayIdx,
      dayExercises
        .filter((_, i) => i !== idx)
        .map((e, i) => ({ ...e, order: i + 1 })),
    );
  };

  const moveExercise = (idx: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= dayExercises.length) return;
    const copy = [...dayExercises];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    setDayExercises(
      dayIdx,
      copy.map((e, i) => ({ ...e, order: i + 1 })),
    );
  };

  const updateExercise = (
    idx: number,
    field: keyof PlanExerciseEntry,
    value: number | string,
  ) => {
    setDayExercises(
      dayIdx,
      dayExercises.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    );
  };

  const copyDayTo = (targetDay: number) => {
    const copied = dayExercises.map((e) => ({ ...e }));
    setDayExercises(targetDay, copied);
    toast.success(`Copied ${DAY_FULL[dayIdx]} exercises to ${DAY_FULL[targetDay]}`);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Plan title is required.");
      return;
    }
    const allExercises = Object.entries(weekExercises).flatMap(
      ([day, exercises]) =>
        exercises.map((e) => ({
          exercise_id: e.exercise_id,
          day_of_week: parseInt(day),
          order: e.order,
          target_sets:
            e.exercise_type === "sets_reps" ? e.target_sets || null : null,
          target_reps:
            e.exercise_type === "sets_reps" ? e.target_reps || null : null,
          target_weight_kg:
            e.exercise_type === "sets_reps" && e.target_weight_kg
              ? e.target_weight_kg
              : null,
          target_duration_seconds:
            e.exercise_type === "time_based" && e.target_duration_seconds
              ? e.target_duration_seconds
              : null,
          target_distance_km:
            e.exercise_type === "time_based" && e.target_distance_km
              ? e.target_distance_km
              : null,
          rest_seconds: e.rest_seconds || null,
          notes: e.notes.trim() || null,
        })),
    );

    if (allExercises.length === 0) {
      toast.error("Add exercises to at least one day.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        exercises: allExercises,
      };
      const { data: plan } = await api.post("/api/workouts/plans", payload);
      toast.success("Workout plan created!");
      router.push(`/workouts/${plan.id}`);
    } catch {
      toast.error("Failed to create plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Create Weekly Plan</h1>
        <p className="text-muted-foreground">
          Build a 7-day workout template. Add exercises per day and mark rest
          days by leaving them empty.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input
            placeholder="e.g. PPL Split, Upper/Lower, Full Body..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Textarea
            placeholder="Brief description of this weekly plan..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <Tabs value={activeDay} onValueChange={setActiveDay}>
        <TabsList className="w-full grid grid-cols-7">
          {DAY_NAMES.map((name, i) => (
            <TabsTrigger key={i} value={String(i)} className="relative">
              {name}
              {(weekExercises[i]?.length ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {Array.from({ length: 7 }, (_, dayIndex) => (
          <TabsContent key={dayIndex} value={String(dayIndex)} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {DAY_FULL[dayIndex]}
                {dayExercises.length === 0 && dayIndex === dayIdx && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    (Rest Day)
                  </span>
                )}
              </h2>
              {dayExercises.length > 0 && dayIndex === dayIdx && (
                <div className="flex gap-1">
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
                        <Copy className="h-3 w-3 mr-1" />
                        {name}
                      </Button>
                    ) : null,
                  )}
                </div>
              )}
            </div>

            {dayIndex === dayIdx && (
              <>
                {dayExercises.map((exercise, idx) => (
                  <Card key={`${exercise.exercise_id}-${idx}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-muted-foreground">
                            {exercise.order}.
                          </span>
                          <CardTitle className="text-base">
                            {exercise.exercise_name}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {exercise.exercise_type === "sets_reps"
                              ? "Sets & Reps"
                              : "Time Based"}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveExercise(idx, "up")}
                            disabled={idx === 0}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveExercise(idx, "down")}
                            disabled={idx === dayExercises.length - 1}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeExercise(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {exercise.muscle_groups.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {exercise.muscle_groups.map((mg) => (
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
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-end gap-3">
                        {exercise.exercise_type === "sets_reps" ? (
                          <>
                            <div>
                              <Label className="text-xs">Sets</Label>
                              <Input
                                type="number"
                                min={1}
                                className="w-20"
                                value={exercise.target_sets || ""}
                                onChange={(e) =>
                                  updateExercise(
                                    idx,
                                    "target_sets",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Reps</Label>
                              <Input
                                type="number"
                                min={1}
                                className="w-20"
                                value={exercise.target_reps || ""}
                                onChange={(e) =>
                                  updateExercise(
                                    idx,
                                    "target_reps",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Weight (kg)</Label>
                              <Input
                                type="number"
                                min={0}
                                step={0.5}
                                className="w-24"
                                value={exercise.target_weight_kg || ""}
                                onChange={(e) =>
                                  updateExercise(
                                    idx,
                                    "target_weight_kg",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <Label className="text-xs">Duration (min)</Label>
                              <Input
                                type="number"
                                min={0}
                                className="w-24"
                                value={
                                  exercise.target_duration_seconds
                                    ? Math.round(
                                        exercise.target_duration_seconds / 60,
                                      )
                                    : ""
                                }
                                onChange={(e) =>
                                  updateExercise(
                                    idx,
                                    "target_duration_seconds",
                                    (parseInt(e.target.value) || 0) * 60,
                                  )
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Distance (km)</Label>
                              <Input
                                type="number"
                                min={0}
                                step={0.1}
                                className="w-24"
                                value={exercise.target_distance_km || ""}
                                onChange={(e) =>
                                  updateExercise(
                                    idx,
                                    "target_distance_km",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>
                          </>
                        )}
                        <div>
                          <Label className="text-xs">Rest (sec)</Label>
                          <Input
                            type="number"
                            min={0}
                            step={15}
                            className="w-24"
                            value={exercise.rest_seconds || ""}
                            onChange={(e) =>
                              updateExercise(
                                idx,
                                "rest_seconds",
                                parseInt(e.target.value) || 0,
                              )
                            }
                          />
                        </div>
                        <div className="flex-1 min-w-36">
                          <Label className="text-xs">Notes</Label>
                          <Input
                            placeholder="Tips, variations..."
                            value={exercise.notes}
                            onChange={(e) =>
                              updateExercise(idx, "notes", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {showSearch ? (
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search exercises..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {searchResults?.map((ex) => (
                          <button
                            key={ex.id}
                            className="w-full flex items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                            onClick={() => addExercise(ex)}
                          >
                            <div>
                              <span className="font-medium">{ex.name}</span>
                              {ex.muscle_groups?.length > 0 && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {ex.muscle_groups.join(", ")}
                                </span>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {ex.exercise_type === "sets_reps"
                                ? "Sets/Reps"
                                : "Time"}
                            </Badge>
                          </button>
                        ))}
                        {searchResults?.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            No exercises found.
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowSearch(false);
                          setSearchQuery("");
                        }}
                      >
                        Cancel
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowSearch(true)}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Exercise
                  </Button>
                )}
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
