"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trophy, RefreshCw, Crown, Medal, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGymStore } from "@/stores/gym-store";
import { useAuthStore } from "@/stores/auth-store";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  id: string;
  user_id: string;
  user_name: string;
  exercise_id: string;
  score: number;
  rank: number;
  category: string;
  period: string;
}

interface RankedExercise {
  id: string;
  name: string;
  exercise_type: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  max_weight: "Max Weight (kg)",
  total_volume: "Total Volume (kg × reps)",
};

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
  return (
    <span className="flex h-5 w-5 items-center justify-center text-sm font-bold text-muted-foreground">
      {rank}
    </span>
  );
}

function formatScore(score: number, category: string): string {
  if (category === "total_volume") {
    if (score >= 1000) return `${(score / 1000).toFixed(1)}k`;
    return score.toFixed(0);
  }
  return `${score.toFixed(1)} kg`;
}

export default function LeaderboardPage() {
  const { currentGym } = useGymStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [exerciseId, setExerciseId] = useState("");
  const [category, setCategory] = useState("max_weight");
  const [period, setPeriod] = useState("all_time");

  const { data: exercises, isLoading: exLoading } = useQuery<RankedExercise[]>({
    queryKey: ["leaderboard-exercises"],
    queryFn: () => api.get("/api/leaderboard/exercises").then((r) => r.data),
  });

  // Auto-select first exercise
  const selectedExerciseId = exerciseId || exercises?.[0]?.id || "";

  const { data: globalEntries, isLoading: globalLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", "global", selectedExerciseId, category, period],
    queryFn: () =>
      api
        .get(
          `/api/leaderboard?exercise_id=${selectedExerciseId}&category=${category}&period=${period}`,
        )
        .then((r) => r.data),
    enabled: !!selectedExerciseId,
  });

  const { data: gymEntries, isLoading: gymLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: [
      "leaderboard",
      "gym",
      currentGym?.id,
      selectedExerciseId,
      category,
      period,
    ],
    queryFn: () =>
      api
        .get(
          `/api/leaderboard/gym/${currentGym?.id}?exercise_id=${selectedExerciseId}&category=${category}&period=${period}`,
        )
        .then((r) => r.data),
    enabled: !!currentGym && !!selectedExerciseId,
  });

  // Fetch current user's rank (for "Your Rank" pinned row)
  const { data: myGlobalRank } = useQuery<LeaderboardEntry | null>({
    queryKey: ["leaderboard", "me", "global", selectedExerciseId, category, period],
    queryFn: () =>
      api
        .get(
          `/api/leaderboard/me?exercise_id=${selectedExerciseId}&category=${category}&period=${period}`,
        )
        .then((r) => r.data),
    enabled: !!selectedExerciseId,
  });

  const { data: myGymRank } = useQuery<LeaderboardEntry | null>({
    queryKey: ["leaderboard", "me", "gym", currentGym?.id, selectedExerciseId, category, period],
    queryFn: () =>
      api
        .get(
          `/api/leaderboard/me?exercise_id=${selectedExerciseId}&category=${category}&period=${period}&gym_id=${currentGym?.id}`,
        )
        .then((r) => r.data),
    enabled: !!currentGym && !!selectedExerciseId,
  });

  const refreshMutation = useMutation({
    mutationFn: () => api.post("/api/leaderboard/compute"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      toast.success("Leaderboard updated!");
    },
    onError: () => toast.error("Failed to refresh leaderboard."),
  });

  const renderEntry = (entry: LeaderboardEntry, pinned?: boolean) => {
    const isCurrentUser = user?.id === entry.user_id;
    return (
      <div
        key={pinned ? `pinned-${entry.id}` : entry.id}
        className={cn(
          "flex items-center justify-between rounded-lg border px-4 py-3 transition-colors",
          isCurrentUser &&
            "border-primary bg-primary/5 ring-1 ring-primary/20",
          entry.rank <= 3 && !isCurrentUser && "bg-muted/30",
        )}
      >
        <div className="flex items-center gap-3">
          <RankIcon rank={entry.rank} />
          <div>
            <span
              className={cn(
                "font-medium",
                isCurrentUser && "text-primary",
              )}
            >
              {entry.user_name}
            </span>
            {isCurrentUser && (
              <span className="ml-2 text-xs text-primary">(You)</span>
            )}
          </div>
        </div>
        <span className="font-semibold tabular-nums">
          {formatScore(entry.score, category)}
        </span>
      </div>
    );
  };

  const renderEntries = (
    entries: LeaderboardEntry[] | undefined,
    loading?: boolean,
    myRank?: LeaderboardEntry | null,
  ) => {
    if (loading) {
      return (
        <p className="py-8 text-center text-muted-foreground">
          Loading rankings...
        </p>
      );
    }
    if (!selectedExerciseId) {
      return (
        <p className="py-8 text-center text-muted-foreground">
          Select an exercise to view rankings.
        </p>
      );
    }
    if (!entries?.length) {
      return (
        <p className="py-8 text-center text-muted-foreground">
          No rankings yet. Hit refresh to compute!
        </p>
      );
    }

    // Check if user is already visible in the list
    const userInList = entries.some((e) => e.user_id === user?.id);
    const showPinnedRow = myRank && !userInList;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground uppercase tracking-wide">
          <span>Rank & Name</span>
          <span>{CATEGORY_LABELS[category] || "Score"}</span>
        </div>
        {entries.map((entry) => renderEntry(entry))}
        {showPinnedRow && (
          <>
            <div className="flex items-center gap-2 px-4 py-1">
              <div className="flex-1 border-t border-dashed" />
              <span className="text-xs text-muted-foreground">Your Rank</span>
              <div className="flex-1 border-t border-dashed" />
            </div>
            {renderEntry(myRank, true)}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8" /> Leaderboard
          </h1>
          <p className="text-muted-foreground">
            See who lifts the heaviest across each exercise.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
        >
          <RefreshCw
            className={cn(
              "mr-2 h-4 w-4",
              refreshMutation.isPending && "animate-spin",
            )}
          />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={selectedExerciseId}
          onValueChange={setExerciseId}
        >
          <SelectTrigger className="w-full sm:w-60">
            <SelectValue placeholder="Select Exercise" />
          </SelectTrigger>
          <SelectContent>
            {exercises?.map((ex) => (
              <SelectItem key={ex.id} value={ex.id}>
                {ex.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="max_weight">Max Weight</SelectItem>
            <SelectItem value="total_volume">Total Volume</SelectItem>
          </SelectContent>
        </Select>

        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="all_time">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="global">
        <TabsList>
          <TabsTrigger value="global">Global</TabsTrigger>
          {currentGym && (
            <TabsTrigger value="gym">{currentGym.name}</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="global">
          <Card>
            <CardHeader>
              <CardTitle>Global Rankings</CardTitle>
              {selectedExerciseId && exercises && (
                <CardDescription>
                  {exercises.find((e) => e.id === selectedExerciseId)?.name} —{" "}
                  {CATEGORY_LABELS[category]}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>{renderEntries(globalEntries, globalLoading, myGlobalRank)}</CardContent>
          </Card>
        </TabsContent>
        {currentGym && (
          <TabsContent value="gym">
            <Card>
              <CardHeader>
                <CardTitle>{currentGym.name} Rankings</CardTitle>
                {selectedExerciseId && exercises && (
                  <CardDescription>
                    {exercises.find((e) => e.id === selectedExerciseId)?.name} —{" "}
                    {CATEGORY_LABELS[category]}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>{renderEntries(gymEntries, gymLoading, myGymRank)}</CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
