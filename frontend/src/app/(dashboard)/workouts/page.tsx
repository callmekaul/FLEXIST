"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Brain, Clock, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import type { WorkoutLog, WorkoutPlan } from "@/types";

export default function WorkoutsPage() {
  const { data: plans } = useQuery<WorkoutPlan[]>({
    queryKey: ["workout-plans"],
    queryFn: () => api.get("/api/workouts/plans").then((r) => r.data),
  });

  const { data: logs } = useQuery<WorkoutLog[]>({
    queryKey: ["workout-logs"],
    queryFn: () => api.get("/api/workouts/logs").then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workouts</h1>
        <p className="text-muted-foreground">
          Create workout plans and track your training sessions.
        </p>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">My Plans</TabsTrigger>
          <TabsTrigger value="history">Workout History</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <div className="flex gap-2">
            <Link href="/workouts/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Plan
              </Button>
            </Link>
            <Link href="/workouts/generate">
              <Button variant="outline">
                <Brain className="mr-2 h-4 w-4" />
                AI Generate
              </Button>
            </Link>
          </div>

          {plans?.length === 0 && (
            <p className="text-muted-foreground">
              No plans yet. Create one manually or generate with AI.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans?.map((plan) => (
              <Link key={plan.id} href={`/workouts/${plan.id}`}>
                <Card className="cursor-pointer transition-colors hover:bg-accent/50 h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.title}</CardTitle>
                      {plan.is_ai_generated && (
                        <Badge variant="secondary">AI</Badge>
                      )}
                    </div>
                    {plan.description && (
                      <CardDescription className="line-clamp-2">
                        {plan.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Created{" "}
                      {new Date(plan.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {logs?.length === 0 && (
            <p className="text-muted-foreground">
              No workouts logged yet. Start by creating a plan and logging a
              workout against it.
            </p>
          )}

          {logs?.map((log) => {
            const duration = log.completed_at
              ? Math.round(
                  (new Date(log.completed_at).getTime() -
                    new Date(log.started_at).getTime()) /
                    60000,
                )
              : null;

            return (
              <Link key={log.id} href={`/workouts/log/${log.id}`}>
                <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">
                        {new Date(log.started_at).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {log.notes && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs sm:max-w-sm">
                          {log.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {log.rating && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Star className="h-3 w-3" /> {log.rating}/5
                        </Badge>
                      )}
                      {duration !== null ? (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Clock className="h-3 w-3" /> {duration} min
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          In Progress
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
