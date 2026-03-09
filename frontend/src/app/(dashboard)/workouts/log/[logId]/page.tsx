"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Dumbbell, Star, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import type { WorkoutLog, ExerciseLogEntry } from "@/types";

export default function WorkoutLogDetailPage() {
  const { logId } = useParams<{ logId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: log, isLoading: logLoading } = useQuery<WorkoutLog>({
    queryKey: ["workout-log", logId],
    queryFn: () => api.get(`/api/workouts/logs/${logId}`).then((r) => r.data),
  });

  const { data: entries } = useQuery<ExerciseLogEntry[]>({
    queryKey: ["workout-log-exercises", logId],
    queryFn: () =>
      api.get(`/api/workouts/logs/${logId}/exercises`).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/workouts/logs/${logId}`),
    onSuccess: () => {
      toast.success("Workout deleted.");
      queryClient.invalidateQueries({ queryKey: ["workout-logs"] });
      router.push("/workouts");
    },
    onError: () => toast.error("Failed to delete workout."),
  });

  if (logLoading) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Loading workout...</p></div>;
  if (!log) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Workout not found.</p></div>;

  const duration = log.completed_at
    ? Math.round(
        (new Date(log.completed_at).getTime() -
          new Date(log.started_at).getTime()) /
          60000,
      )
    : null;

  // Group entries by exercise (order + exercise_id)
  const grouped = entries?.reduce(
    (acc, entry) => {
      const key = `${entry.exercise_id}-${entry.order}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      return acc;
    },
    {} as Record<string, ExerciseLogEntry[]>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {new Date(log.started_at).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h1>
          <div className="mt-2 flex flex-wrap gap-3">
            {duration !== null && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" /> {duration} min
              </Badge>
            )}
            {log.rating && (
              <Badge variant="outline" className="gap-1">
                <Star className="h-3 w-3" /> {log.rating}/5
              </Badge>
            )}
            {entries && (
              <Badge variant="secondary">
                {Object.keys(grouped ?? {}).length} exercises
              </Badge>
            )}
          </div>
          {log.notes && (
            <p className="mt-2 text-muted-foreground">{log.notes}</p>
          )}
        </div>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {grouped &&
          Object.values(grouped).map((group, i) => {
            const first = group[0];
            const isSetsReps = first.exercise_type === "sets_reps";

            return (
              <Card key={i}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {first.order}
                      </span>
                      <CardTitle className="text-base">
                        {first.exercise_name ?? `Exercise #${first.order}`}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {isSetsReps ? "Sets/Reps" : "Time"}
                      </Badge>
                    </div>
                  </div>
                  {first.muscle_groups?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {first.muscle_groups.map((mg) => (
                        <Badge
                          key={mg}
                          variant="secondary"
                          className="text-xs capitalize"
                        >
                          {mg}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  {isSetsReps ? (
                    <div className="space-y-1">
                      {group.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center gap-4 text-sm"
                        >
                          <span className="w-12 text-muted-foreground">
                            Set {entry.set_number}
                          </span>
                          <span className="flex items-center gap-1">
                            <Dumbbell className="h-3 w-3" />
                            {entry.reps} reps
                          </span>
                          {entry.weight_kg != null && entry.weight_kg > 0 && (
                            <span>@ {entry.weight_kg}kg</span>
                          )}
                          {entry.is_personal_record && (
                            <Badge className="text-xs">PR!</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-4 text-sm">
                      {first.duration_seconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.round(first.duration_seconds / 60)} min
                        </span>
                      )}
                      {first.distance_km && (
                        <span>{first.distance_km} km</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
