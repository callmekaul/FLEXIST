"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Brain,
  Loader2,
  Dumbbell,
  Clock,
  Star,
  TrendingUp,
  Calendar,
  Plus,
  ChevronRight,
  Trash2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/auth-store";
import api from "@/lib/api";
import { toast } from "sonner";
import type { WorkoutLog, BodyMeasurement } from "@/types";

const MEASUREMENT_FIELDS = [
  { key: "weight_kg", label: "Weight (kg)", step: "0.1" },
  { key: "height_cm", label: "Height (cm)", step: "0.1" },
  { key: "bicep_cm", label: "Bicep (cm)", step: "0.1" },
  { key: "chest_cm", label: "Chest (cm)", step: "0.1" },
  { key: "waist_cm", label: "Waist (cm)", step: "0.1" },
  { key: "hip_cm", label: "Hip (cm)", step: "0.1" },
  { key: "thigh_cm", label: "Thigh (cm)", step: "0.1" },
  { key: "calf_cm", label: "Calf (cm)", step: "0.1" },
  { key: "forearm_cm", label: "Forearm (cm)", step: "0.1" },
  { key: "neck_cm", label: "Neck (cm)", step: "0.1" },
] as const;

interface AnalysisResult {
  summary?: string;
  workouts_completed?: number;
  avg_duration_minutes?: number | null;
  most_trained_muscles?: string[];
  least_trained_muscles?: string[];
  strengths?: string[];
  areas_for_improvement?: string[];
  recommendations?: string[];
  measurement_trends?: string;
  injury_considerations?: string | null;
  motivation?: string;
}

export default function ProgressPage() {
  const { user, refreshUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [injuries, setInjuries] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const [measurementForm, setMeasurementForm] = useState<Record<string, string>>({});

  const { data: logs } = useQuery<WorkoutLog[]>({
    queryKey: ["workout-logs"],
    queryFn: () => api.get("/api/workouts/logs?limit=100").then((r) => r.data),
  });

  const { data: measurements } = useQuery<BodyMeasurement[]>({
    queryKey: ["body-measurements"],
    queryFn: () => api.get("/api/users/me/measurements").then((r) => r.data),
  });

  const addMeasurement = useMutation({
    mutationFn: (data: Record<string, number>) =>
      api.post("/api/users/me/measurements", data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["body-measurements"] });
      await refreshUser();
      toast.success("Measurement logged.");
      setShowAddMeasurement(false);
      setMeasurementForm({});
    },
    onError: () => toast.error("Failed to log measurement."),
  });

  const deleteMeasurement = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/users/me/measurements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["body-measurements"] });
      toast.success("Measurement deleted.");
    },
  });

  const bmi =
    user?.weight_kg && user?.height_cm
      ? (user.weight_kg / (user.height_cm / 100) ** 2).toFixed(1)
      : null;

  const stats = useMemo(() => {
    if (!logs) return null;
    const completed = logs.filter((l) => l.completed_at);
    const totalWorkouts = completed.length;
    const totalMinutes = completed.reduce((acc, l) => {
      if (!l.completed_at) return acc;
      return (
        acc +
        (new Date(l.completed_at).getTime() -
          new Date(l.started_at).getTime()) /
          60000
      );
    }, 0);
    const avgDuration = totalWorkouts > 0 ? totalMinutes / totalWorkouts : 0;
    const ratings = completed.filter((l) => l.rating != null);
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((acc, l) => acc + (l.rating ?? 0), 0) / ratings.length
        : null;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const thisWeek = completed.filter(
      (l) => new Date(l.started_at) >= weekStart,
    ).length;
    return {
      totalWorkouts,
      totalMinutes: Math.round(totalMinutes),
      avgDuration: Math.round(avgDuration),
      avgRating,
      thisWeek,
    };
  }, [logs]);

  // Weekly workout frequency chart data (last 8 weeks)
  const weeklyFrequencyData = useMemo(() => {
    if (!logs) return [];
    const now = new Date();
    const weeks: { label: string; workouts: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - w * 7 - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const count = logs.filter((l) => {
        const d = new Date(l.started_at);
        return d >= weekStart && d < weekEnd && l.completed_at;
      }).length;
      weeks.push({
        label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        workouts: count,
      });
    }
    return weeks;
  }, [logs]);

  // Weekly volume chart data (total weight × reps per week, fetched from exercise logs)
  const { data: exerciseLogs } = useQuery<{ weight_kg: number | null; reps: number | null; logged_at: string }[]>({
    queryKey: ["exercise-logs-volume"],
    queryFn: () => api.get("/api/workouts/exercise-logs?limit=500").then((r) => r.data),
  });

  const weeklyVolumeData = useMemo(() => {
    if (!exerciseLogs) return [];
    const now = new Date();
    const weeks: { label: string; volume: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - w * 7 - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const vol = exerciseLogs
        .filter((e) => {
          const d = new Date(e.logged_at);
          return d >= weekStart && d < weekEnd && e.weight_kg && e.reps;
        })
        .reduce((acc, e) => acc + (e.weight_kg ?? 0) * (e.reps ?? 0), 0);
      weeks.push({
        label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        volume: Math.round(vol),
      });
    }
    return weeks;
  }, [exerciseLogs]);

  const handleAddMeasurement = () => {
    const data: Record<string, number> = {};
    for (const [key, val] of Object.entries(measurementForm)) {
      if (val) data[key] = parseFloat(val);
    }
    if (Object.keys(data).length === 0) {
      toast.error("Enter at least one measurement.");
      return;
    }
    addMeasurement.mutate(data);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/api/ai/analyze-progress", {
        weeks: 4,
        injuries: injuries || null,
      });
      setAnalysis(data);
    } catch {
      toast.error("Failed to analyze progress.");
    } finally {
      setLoading(false);
    }
  };

  const recentLogs = logs?.slice(0, 10) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Progress</h1>
        <p className="text-muted-foreground">
          Track your fitness journey and get AI insights.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Body stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/progress/measurements">
              <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Weight
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {user?.weight_kg ? `${user.weight_kg} kg` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">&nbsp;</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/progress/measurements">
              <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Height
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {user?.height_cm ? `${user.height_cm} cm` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">&nbsp;</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/progress/measurements">
              <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    BMI
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{bmi ?? "—"}</p>
                  {bmi && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {parseFloat(bmi) < 18.5
                        ? "Underweight"
                        : parseFloat(bmi) < 25
                          ? "Normal"
                          : parseFloat(bmi) < 30
                            ? "Overweight"
                            : "Obese"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Workout stats */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1">
                    <Dumbbell className="h-3.5 w-3.5" /> Total Workouts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.totalWorkouts}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.thisWeek}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Total Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {stats.totalMinutes >= 60
                      ? `${Math.floor(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`
                      : `${stats.totalMinutes}m`}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" /> Avg Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.avgDuration} min</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" /> Avg Rating
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {stats.avgRating ? `${stats.avgRating.toFixed(1)}/5` : "—"}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Workout frequency chart */}
          {weeklyFrequencyData.some((w) => w.workouts > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weekly Workout Frequency</CardTitle>
                <CardDescription>Completed workouts per week (last 8 weeks)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyFrequencyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="workouts" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Weekly volume chart */}
          {weeklyVolumeData.some((w) => w.volume > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weekly Training Volume</CardTitle>
                <CardDescription>Total weight × reps per week (kg)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyVolumeData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value) => [`${Number(value).toLocaleString()} kg`, "Volume"]}
                    />
                    <Bar dataKey="volume" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Recent workouts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Workouts</CardTitle>
              <CardDescription>Your latest training sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No workouts logged yet. Start training!
                </p>
              ) : (
                <div className="space-y-2">
                  {recentLogs.map((log) => {
                    const duration = log.completed_at
                      ? Math.round(
                          (new Date(log.completed_at).getTime() -
                            new Date(log.started_at).getTime()) /
                            60000,
                        )
                      : null;
                    return (
                      <Link key={log.id} href={`/workouts/log/${log.id}`}>
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-accent/50">
                          <div>
                            <p className="font-medium text-sm">
                              {new Date(log.started_at).toLocaleDateString(
                                "en-US",
                                { weekday: "short", month: "short", day: "numeric" },
                              )}
                            </p>
                            {log.notes && (
                              <p className="text-xs text-muted-foreground truncate max-w-48 sm:max-w-xs">
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
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MEASUREMENTS TAB */}
        <TabsContent value="measurements" className="space-y-6">
          {!showAddMeasurement ? (
            <Button
              variant="outline"
              onClick={() => setShowAddMeasurement(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Log Measurement
            </Button>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">New Measurement</CardTitle>
                <CardDescription>
                  Enter the measurements you want to track. Leave blank to skip.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {MEASUREMENT_FIELDS.map(({ key, label, step }) => (
                    <div key={key}>
                      <Label className="text-xs">{label}</Label>
                      <Input
                        type="number"
                        step={step}
                        value={measurementForm[key] || ""}
                        onChange={(e) =>
                          setMeasurementForm((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddMeasurement}
                    disabled={addMeasurement.isPending}
                    size="sm"
                  >
                    <Plus className="mr-1 h-4 w-4" /> Log
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddMeasurement(false);
                      setMeasurementForm({});
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Measurement history */}
          {measurements && measurements.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Measurement History
                  </CardTitle>
                  <Link href="/progress/measurements">
                    <Button variant="outline" size="sm">
                      View Charts
                      <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...measurements].reverse().map((m) => {
                    const parts: string[] = [];
                    if (m.weight_kg != null) parts.push(`${m.weight_kg}kg`);
                    if (m.height_cm != null) parts.push(`${m.height_cm}cm`);
                    if (m.bicep_cm != null) parts.push(`Bicep: ${m.bicep_cm}`);
                    if (m.chest_cm != null) parts.push(`Chest: ${m.chest_cm}`);
                    if (m.waist_cm != null) parts.push(`Waist: ${m.waist_cm}`);
                    if (m.hip_cm != null) parts.push(`Hip: ${m.hip_cm}`);
                    if (m.thigh_cm != null) parts.push(`Thigh: ${m.thigh_cm}`);
                    if (m.calf_cm != null) parts.push(`Calf: ${m.calf_cm}`);
                    if (m.forearm_cm != null)
                      parts.push(`Forearm: ${m.forearm_cm}`);
                    if (m.neck_cm != null) parts.push(`Neck: ${m.neck_cm}`);

                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-lg border px-4 py-2 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground w-28 shrink-0">
                            {new Date(m.measured_at).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" },
                            )}
                          </span>
                          <span className="text-sm">
                            {parts.join(" | ")}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => deleteMeasurement.mutate(m.id)}
                          disabled={deleteMeasurement.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground text-sm">
              No measurements logged yet. Log your first measurement above.
            </p>
          )}
        </TabsContent>

        {/* AI ANALYSIS TAB */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Progress Analysis</CardTitle>
              <CardDescription>
                Get AI-powered insights on your workout trends, body
                measurements, and recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current Injuries / Limitations (optional)</Label>
                <Textarea
                  value={injuries}
                  onChange={(e) => setInjuries(e.target.value)}
                  placeholder="e.g. Left knee pain, recovering from shoulder surgery..."
                  rows={2}
                />
              </div>
              <Button onClick={handleAnalyze} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Analyze My Progress
                  </>
                )}
              </Button>

              {analysis && (
                <div className="space-y-4">
                  {analysis.summary && (
                    <p className="text-sm">{analysis.summary}</p>
                  )}

                  {analysis.motivation && (
                    <p className="text-sm italic text-primary">
                      {analysis.motivation}
                    </p>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    {analysis.strengths && analysis.strengths.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">
                          Strengths
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {analysis.strengths.map((s, i) => (
                            <li key={i}>+ {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.areas_for_improvement &&
                      analysis.areas_for_improvement.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-1">
                            Areas to Improve
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {analysis.areas_for_improvement.map((s, i) => (
                              <li key={i}>- {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>

                  {analysis.recommendations &&
                    analysis.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">
                          Recommendations
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {analysis.recommendations.map((r, i) => (
                            <li key={i}>* {r}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {analysis.measurement_trends && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">
                        Measurement Trends
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {analysis.measurement_trends}
                      </p>
                    </div>
                  )}

                  {analysis.injury_considerations && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">
                        Injury Considerations
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {analysis.injury_considerations}
                      </p>
                    </div>
                  )}

                  {(analysis.most_trained_muscles?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm font-medium">
                        Most trained:
                      </span>
                      {analysis.most_trained_muscles?.map((m) => (
                        <Badge key={m} variant="secondary" className="text-xs">
                          {m}
                        </Badge>
                      ))}
                      {(analysis.least_trained_muscles?.length ?? 0) > 0 && (
                        <>
                          <span className="text-sm font-medium ml-2">
                            Least trained:
                          </span>
                          {analysis.least_trained_muscles?.map((m) => (
                            <Badge
                              key={m}
                              variant="outline"
                              className="text-xs"
                            >
                              {m}
                            </Badge>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
