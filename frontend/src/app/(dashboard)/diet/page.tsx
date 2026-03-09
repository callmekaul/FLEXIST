"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Brain, Plus, Trash2, ChevronDown, ChevronUp, Utensils } from "lucide-react";
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
import { toast } from "sonner";
import type { DietPlan } from "@/types";

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
  name?: string;
  foods?: string[];
  calories?: number;
}

export default function DietPage() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: plans, isLoading: plansLoading } = useQuery<DietPlan[]>({
    queryKey: ["diet-plans"],
    queryFn: () => api.get("/api/diet-plans").then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/diet-plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diet-plans"] });
      toast.success("Diet plan deleted.");
    },
    onError: () => toast.error("Failed to delete plan."),
  });

  const mealLabel = (key: string) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Detect if meals are day-keyed (weekly) or flat (legacy single-day)
  const isWeeklyMeals = (meals: Record<string, unknown>) =>
    Object.keys(meals).some((k) => /^\d$/.test(k));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Diet Plans</h1>
          <p className="text-muted-foreground">
            Your nutrition plans and macros.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/diet/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          </Link>
          <Link href="/diet/generate">
            <Button variant="outline">
              <Brain className="mr-2 h-4 w-4" />
              AI Generate
            </Button>
          </Link>
        </div>
      </div>

      {plansLoading && (
        <p className="text-muted-foreground">Loading diet plans...</p>
      )}

      {!plansLoading && plans?.length === 0 && (
        <p className="text-muted-foreground">
          No diet plans yet. Generate one with AI!
        </p>
      )}

      <div className="space-y-4">
        {plans?.map((plan) => {
          const expanded = expandedId === plan.id;
          const meals = (plan.meals || {}) as Record<string, unknown>;
          const weekly = isWeeklyMeals(meals);

          return (
            <Card key={plan.id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpandedId(expanded ? null : plan.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>{plan.title}</CardTitle>
                    {plan.is_ai_generated && (
                      <Badge variant="secondary">AI</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.target_calories && (
                      <Badge variant="outline">
                        {plan.target_calories} kcal
                      </Badge>
                    )}
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <CardDescription>
                  <span className="flex gap-3 text-sm">
                    {plan.protein_g != null && (
                      <span>Protein: {plan.protein_g}g</span>
                    )}
                    {plan.carbs_g != null && (
                      <span>Carbs: {plan.carbs_g}g</span>
                    )}
                    {plan.fat_g != null && <span>Fat: {plan.fat_g}g</span>}
                  </span>
                </CardDescription>
              </CardHeader>

              {expanded && (
                <CardContent className="space-y-3 pt-0">
                  {plan.ai_reasoning && (
                    <p className="text-sm text-muted-foreground italic">
                      {plan.ai_reasoning}
                    </p>
                  )}

                  {weekly ? (
                    <Tabs defaultValue="0">
                      <TabsList className="w-full grid grid-cols-7">
                        {DAY_NAMES.map((name, i) => (
                          <TabsTrigger key={i} value={String(i)}>
                            {name}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        const dayMeals = (meals[String(dayIndex)] || {}) as Record<string, MealData>;
                        return (
                          <TabsContent
                            key={dayIndex}
                            value={String(dayIndex)}
                            className="space-y-2"
                          >
                            <h4 className="font-semibold">
                              {DAY_FULL[dayIndex]}
                            </h4>
                            {Object.entries(dayMeals).map(([key, meal]) => (
                              <div
                                key={key}
                                className="rounded-lg border px-4 py-3"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Utensils className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">
                                      {mealLabel(key)}
                                    </span>
                                  </div>
                                  {meal.calories && (
                                    <span className="text-xs text-muted-foreground">
                                      {meal.calories} kcal
                                    </span>
                                  )}
                                </div>
                                {meal.foods && meal.foods.length > 0 && (
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
                    // Legacy flat meals format
                    Object.entries(meals as Record<string, MealData>).map(
                      ([key, meal]) => (
                        <div
                          key={key}
                          className="rounded-lg border px-4 py-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Utensils className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">
                                {mealLabel(key)}
                              </span>
                            </div>
                            {meal.calories && (
                              <span className="text-xs text-muted-foreground">
                                {meal.calories} kcal
                              </span>
                            )}
                          </div>
                          {meal.foods && meal.foods.length > 0 && (
                            <ul className="text-sm text-muted-foreground space-y-0.5">
                              {meal.foods.map((food, i) => (
                                <li key={i}>- {food}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ),
                    )
                  )}

                  <div className="pt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this diet plan?")) {
                          deleteMutation.mutate(plan.id);
                        }
                      }}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete Plan
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
