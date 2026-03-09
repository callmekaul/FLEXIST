"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Dumbbell,
  Clock,
  Star,
  Scale,
  Ruler,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { useGymStore } from "@/stores/gym-store";
import api from "@/lib/api";
import type { WorkoutLog } from "@/types";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { currentGym } = useGymStore();

  const { data: lastLog } = useQuery<WorkoutLog | null>({
    queryKey: ["last-workout-log"],
    queryFn: () =>
      api
        .get("/api/workouts/logs", { params: { limit: 1 } })
        .then((r) => (r.data.length > 0 ? r.data[0] : null)),
  });

  const firstName = user?.full_name?.split(" ")[0] || "there";
  const bmi =
    user?.weight_kg && user?.height_cm
      ? (user.weight_kg / (user.height_cm / 100) ** 2).toFixed(1)
      : null;

  const lastDuration =
    lastLog?.completed_at && lastLog?.started_at
      ? Math.round(
          (new Date(lastLog.completed_at).getTime() -
            new Date(lastLog.started_at).getTime()) /
            60000,
        )
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-muted-foreground">
          {currentGym
            ? `Training at ${currentGym.name}`
            : "No gym selected yet"}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Weight</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {user?.weight_kg ? `${user.weight_kg} kg` : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Height</CardTitle>
            <Ruler className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {user?.height_cm ? `${user.height_cm} cm` : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">BMI</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{bmi ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Log Workout Button */}
      <div>
        <Link href="/workouts">
          <Button size="lg" className="w-full md:w-auto">
            <Dumbbell className="mr-2 h-5 w-5" />
            Log Workout
          </Button>
        </Link>
      </div>

      {/* Last Workout */}
      {lastLog && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Last Workout</CardTitle>
            <CardDescription>
              {new Date(lastLog.started_at).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {lastDuration !== null && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" /> {lastDuration} min
                </Badge>
              )}
              {lastLog.rating && (
                <Badge variant="outline" className="gap-1">
                  <Star className="h-3 w-3" /> {lastLog.rating}/5
                </Badge>
              )}
            </div>
            <Link href={`/workouts/log/${lastLog.id}`}>
              <Button variant="outline" size="sm">
                View Workout Log
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Setup Prompts */}
      {!currentGym && (
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Select your gym to get workouts tailored to available equipment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/gym/select">
              <Button>Select Your Gym</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {user &&
        (!user.weight_kg ||
          !user.height_cm ||
          !user.fitness_goals?.length) && (
          <Card>
            <CardHeader>
              <CardTitle>Complete Your Profile</CardTitle>
              <CardDescription>
                Add your physical details and fitness goals so AI can create
                personalized plans for you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/profile">
                <Button variant="secondary">Update Profile</Button>
              </Link>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
