"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Check,
  X,
  Timer,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Pencil,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { localISOString, toDatetimeLocal } from "@/lib/utils";
import { toast } from "sonner";
import type { WorkoutLog, Exercise } from "@/types";

interface PlanExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_type: string;
  muscle_groups: string[];
  day_of_week: number;
  order: number;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
  target_duration_seconds: number | null;
  target_distance_km: number | null;
  rest_seconds: number | null;
  notes: string | null;
}

interface SetEntry {
  set_number: number;
  reps: number;
  weight_kg: number;
}

interface ExerciseEntry {
  exercise_id: string;
  exercise_name: string;
  exercise_type: "sets_reps" | "time_based";
  muscle_groups: string[];
  order: number;
  sets: SetEntry[];
  duration_seconds: number;
  distance_km: number;
  collapsed: boolean;
}

export default function ActiveWorkoutPage() {
  const { logId } = useParams<{ logId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [entries, setEntries] = useState<ExerciseEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [editingTime, setEditingTime] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: log, isLoading: logLoading } = useQuery<WorkoutLog>({
    queryKey: ["workout-log", logId],
    queryFn: () => api.get(`/api/workouts/logs/${logId}`).then((r) => r.data),
  });

  const { data: planExercises } = useQuery<PlanExercise[]>({
    queryKey: ["plan-exercises", log?.plan_id],
    queryFn: () =>
      api
        .get(`/api/workouts/plans/${log?.plan_id}/exercises`)
        .then((r) => r.data),
    enabled: !!log?.plan_id,
  });

  const { data: allExercises } = useQuery<Exercise[]>({
    queryKey: ["exercises", exerciseSearch],
    queryFn: () =>
      api
        .get("/api/exercises", { params: { search: exerciseSearch, limit: 20 } })
        .then((r) => r.data),
    enabled: showAddExercise,
  });

  // Initialize start time from log
  useEffect(() => {
    if (log && !startTime) {
      setStartTime(toDatetimeLocal(log.started_at));
    }
  }, [log, startTime]);

  // Initialize from plan exercises, filtered by day_of_week
  useEffect(() => {
    if (planExercises && entries.length === 0) {
      const dayFiltered =
        log?.day_of_week != null
          ? planExercises.filter((pe) => pe.day_of_week === log.day_of_week)
          : planExercises;
      setEntries(
        dayFiltered.map((pe) => ({
          exercise_id: pe.exercise_id,
          exercise_name: pe.exercise_name,
          exercise_type: pe.exercise_type as "sets_reps" | "time_based",
          muscle_groups: pe.muscle_groups || [],
          order: pe.order,
          sets:
            pe.exercise_type === "sets_reps"
              ? Array.from({ length: pe.target_sets ?? 3 }, (_, i) => ({
                  set_number: i + 1,
                  reps: pe.target_reps ?? 0,
                  weight_kg: pe.target_weight_kg ?? 0,
                }))
              : [],
          duration_seconds: pe.target_duration_seconds ?? 0,
          distance_km: pe.target_distance_km ?? 0,
          collapsed: false,
        })),
      );
    }
  }, [planExercises, entries.length, log?.day_of_week]);

  // Timer — uses editable startTime
  useEffect(() => {
    if (!startTime) return;
    const start = new Date(startTime).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };

  const updateSet = (
    exIdx: number,
    setIdx: number,
    field: keyof SetEntry,
    value: number,
  ) => {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === exIdx
          ? {
              ...e,
              sets: e.sets.map((s, j) =>
                j === setIdx ? { ...s, [field]: value } : s,
              ),
            }
          : e,
      ),
    );
  };

  const addSet = (exIdx: number) => {
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx) return e;
        const lastSet = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [
            ...e.sets,
            {
              set_number: e.sets.length + 1,
              reps: lastSet?.reps ?? 0,
              weight_kg: lastSet?.weight_kg ?? 0,
            },
          ],
        };
      }),
    );
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === exIdx
          ? {
              ...e,
              sets: e.sets
                .filter((_, j) => j !== setIdx)
                .map((s, j) => ({ ...s, set_number: j + 1 })),
            }
          : e,
      ),
    );
  };

  const updateTimeBased = (
    exIdx: number,
    field: "duration_seconds" | "distance_km",
    value: number,
  ) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === exIdx ? { ...e, [field]: value } : e)),
    );
  };

  const toggleCollapse = (exIdx: number) => {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === exIdx ? { ...e, collapsed: !e.collapsed } : e,
      ),
    );
  };

  const addExercise = (exercise: Exercise) => {
    setEntries((prev) => [
      ...prev,
      {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        exercise_type: exercise.exercise_type,
        muscle_groups: exercise.muscle_groups || [],
        order: prev.length + 1,
        sets:
          exercise.exercise_type === "sets_reps"
            ? [{ set_number: 1, reps: 0, weight_kg: 0 }]
            : [],
        duration_seconds: 0,
        distance_km: 0,
        collapsed: false,
      },
    ]);
    setShowAddExercise(false);
    setExerciseSearch("");
  };

  const removeExercise = (exIdx: number) => {
    setEntries((prev) =>
      prev
        .filter((_, i) => i !== exIdx)
        .map((e, i) => ({ ...e, order: i + 1 })),
    );
  };

  const finishWorkout = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Build exercise log entries
      const logEntries: Record<string, unknown>[] = [];
      for (const e of entries) {
        if (e.exercise_type === "sets_reps") {
          for (const s of e.sets) {
            logEntries.push({
              exercise_id: e.exercise_id,
              exercise_type: e.exercise_type,
              order: e.order,
              set_number: s.set_number,
              reps: s.reps,
              weight_kg: s.weight_kg,
            });
          }
        } else {
          logEntries.push({
            exercise_id: e.exercise_id,
            exercise_type: e.exercise_type,
            order: e.order,
            duration_seconds: e.duration_seconds || null,
            distance_km: e.distance_km || null,
          });
        }
      }

      if (logEntries.length > 0) {
        await api.post(`/api/workouts/logs/${logId}/exercises`, logEntries);
      }

      // Complete the log — use edited end time or current local time
      const completedAt = endTime
        ? new Date(endTime).toISOString().replace("Z", "")
        : localISOString();
      await api.patch(`/api/workouts/logs/${logId}`, null, {
        params: {
          started_at: startTime ? new Date(startTime).toISOString().replace("Z", "") : undefined,
          completed_at: completedAt,
          notes: notes || null,
          rating: rating || null,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["workout-logs"] });
      toast.success("Workout complete!");
      router.push("/workouts");
    } catch {
      toast.error("Failed to save workout.");
    } finally {
      setSubmitting(false);
    }
  };

  if (logLoading) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Loading workout...</p></div>;
  if (!log) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Workout not found.</p></div>;

  return (
    <div className="space-y-4 pb-24">
      {/* Header with timer */}
      <div className="sticky top-0 z-10 rounded-lg border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Active Workout</h1>
            <div className="flex items-center gap-2 text-2xl font-mono text-primary">
              <Timer className="h-5 w-5" />
              {formatTime(elapsed)}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setEditingTime(!editingTime)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (entries.length === 0 || confirm("Discard this workout?")) {
                  router.push("/workouts");
                }
              }}
            >
              <X className="mr-1 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={finishWorkout} disabled={submitting}>
              <Check className="mr-1 h-4 w-4" /> {submitting ? "Saving..." : "Finish"}
            </Button>
          </div>
        </div>

        {editingTime && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <Label className="text-xs">Start Time</Label>
              <Input
                type="datetime-local"
                step="1"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">End Time (optional)</Label>
              <Input
                type="datetime-local"
                step="1"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        )}
      </div>

      {/* Exercise entries */}
      {entries.map((entry, exIdx) => (
        <Card key={`${entry.exercise_id}-${exIdx}`}>
          <CardHeader
            className="cursor-pointer py-3"
            onClick={() => toggleCollapse(exIdx)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {exIdx + 1}
                </span>
                <CardTitle className="text-base">{entry.exercise_name}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {entry.exercise_type === "sets_reps" ? "Sets/Reps" : "Time"}
                </Badge>
              </div>
              {entry.muscle_groups?.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-8">
                  {entry.muscle_groups.map((mg) => (
                    <Badge key={mg} variant="secondary" className="text-xs capitalize px-1.5 py-0">
                      {mg}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeExercise(exIdx);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
                {entry.collapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>

          {!entry.collapsed && (
            <CardContent className="space-y-3 pt-0">
              {entry.exercise_type === "sets_reps" ? (
                <>
                  <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground">
                    <span>Set</span>
                    <span>Reps</span>
                    <span>Weight (kg)</span>
                    <span />
                  </div>
                  {entry.sets.map((s, setIdx) => (
                    <div
                      key={setIdx}
                      className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2"
                    >
                      <span className="w-8 text-center text-sm font-medium">
                        {s.set_number}
                      </span>
                      <Input
                        type="number"
                        value={s.reps || ""}
                        onChange={(e) =>
                          updateSet(exIdx, setIdx, "reps", Number(e.target.value))
                        }
                        placeholder="0"
                        className="h-9"
                      />
                      <Input
                        type="number"
                        value={s.weight_kg || ""}
                        onChange={(e) =>
                          updateSet(
                            exIdx,
                            setIdx,
                            "weight_kg",
                            Number(e.target.value),
                          )
                        }
                        placeholder="0"
                        className="h-9"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeSet(exIdx, setIdx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSet(exIdx)}
                    className="w-full"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add Set
                  </Button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={
                        entry.duration_seconds
                          ? Math.round(entry.duration_seconds / 60)
                          : ""
                      }
                      onChange={(e) =>
                        updateTimeBased(
                          exIdx,
                          "duration_seconds",
                          Number(e.target.value) * 60,
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Distance (km)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={entry.distance_km || ""}
                      onChange={(e) =>
                        updateTimeBased(
                          exIdx,
                          "distance_km",
                          Number(e.target.value),
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}

      {/* Add exercise */}
      {showAddExercise ? (
        <Card>
          <CardContent className="space-y-3 py-4">
            <Input
              placeholder="Search exercises..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {allExercises?.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex)}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <div>
                    <span>{ex.name}</span>
                    {ex.muscle_groups?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {ex.muscle_groups.map((mg) => (
                          <Badge key={mg} variant="secondary" className="text-xs capitalize px-1 py-0">
                            {mg}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 ml-2">
                    {ex.exercise_type === "sets_reps" ? "Sets/Reps" : "Time"}
                  </Badge>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddExercise(false);
                setExerciseSearch("");
              }}
              className="w-full"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowAddExercise(true)}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Exercise
        </Button>
      )}

      {/* Notes & Rating */}
      <Card>
        <CardContent className="space-y-3 py-4">
          <div>
            <Label className="text-xs">Workout Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it go?"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs">Rating</Label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  className={`h-8 w-8 rounded text-sm font-medium transition-colors ${
                    rating >= r
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
