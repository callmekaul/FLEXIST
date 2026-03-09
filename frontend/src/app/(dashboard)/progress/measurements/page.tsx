"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { toast } from "sonner";
import type { BodyMeasurement } from "@/types";

const BODY_METRICS = [
  { key: "bicep_cm", label: "Bicep", color: "#8884d8" },
  { key: "chest_cm", label: "Chest", color: "#82ca9d" },
  { key: "waist_cm", label: "Waist", color: "#ffc658" },
  { key: "hip_cm", label: "Hip", color: "#ff7c43" },
  { key: "thigh_cm", label: "Thigh", color: "#a4de6c" },
  { key: "calf_cm", label: "Calf", color: "#d0ed57" },
  { key: "forearm_cm", label: "Forearm", color: "#8dd1e1" },
  { key: "neck_cm", label: "Neck", color: "#e88c8c" },
] as const;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function MeasurementsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: measurements, isLoading: measLoading } = useQuery<BodyMeasurement[]>({
    queryKey: ["body-measurements"],
    queryFn: () => api.get("/api/users/me/measurements").then((r) => r.data),
  });

  const deleteMeasurement = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/users/me/measurements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["body-measurements"] });
      toast.success("Measurement deleted.");
    },
  });

  const weightChartData = useMemo(() => {
    if (!measurements) return [];
    return measurements
      .filter((m) => m.weight_kg != null)
      .map((m) => ({ date: formatDate(m.measured_at), weight: m.weight_kg }));
  }, [measurements]);

  const heightChartData = useMemo(() => {
    if (!measurements) return [];
    return measurements
      .filter((m) => m.height_cm != null)
      .map((m) => ({ date: formatDate(m.measured_at), height: m.height_cm }));
  }, [measurements]);

  const bmiChartData = useMemo(() => {
    if (!measurements) return [];
    let lastHeight: number | null = null;
    return measurements
      .filter((m) => {
        if (m.height_cm != null) lastHeight = m.height_cm;
        return m.weight_kg != null && lastHeight != null;
      })
      .map((m) => {
        if (m.height_cm != null) lastHeight = m.height_cm;
        return {
          date: formatDate(m.measured_at),
          bmi: parseFloat((m.weight_kg! / (lastHeight! / 100) ** 2).toFixed(1)),
        };
      });
  }, [measurements]);

  // Body measurement chart data - combine all metrics into single data points per date
  const bodyChartData = useMemo(() => {
    if (!measurements) return [];
    return measurements
      .filter((m) =>
        BODY_METRICS.some((metric) => (m as unknown as Record<string, unknown>)[metric.key] != null),
      )
      .map((m) => {
        const point: Record<string, unknown> = { date: formatDate(m.measured_at) };
        for (const metric of BODY_METRICS) {
          const val = (m as unknown as Record<string, unknown>)[metric.key];
          if (val != null) point[metric.key] = val;
        }
        return point;
      });
  }, [measurements]);

  // Which body metrics actually have data
  const activeBodyMetrics = useMemo(() => {
    if (!measurements) return [];
    return BODY_METRICS.filter((metric) =>
      measurements.some((m) => (m as unknown as Record<string, unknown>)[metric.key] != null),
    );
  }, [measurements]);

  const weightStats = useMemo(() => {
    if (!measurements) return null;
    const withWeight = measurements.filter((m) => m.weight_kg != null);
    if (withWeight.length < 2) return null;
    const first = withWeight[0].weight_kg!;
    const last = withWeight[withWeight.length - 1].weight_kg!;
    const min = Math.min(...withWeight.map((m) => m.weight_kg!));
    const max = Math.max(...withWeight.map((m) => m.weight_kg!));
    return {
      change: parseFloat((last - first).toFixed(1)),
      min,
      max,
      current: last,
    };
  }, [measurements]);

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Body Measurements</h1>
          <p className="text-muted-foreground">
            Track your weight, body composition, and measurement trends.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      {weightStats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Current</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{weightStats.current} kg</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Change</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${weightStats.change > 0 ? "text-red-500" : weightStats.change < 0 ? "text-green-500" : ""}`}
              >
                {weightStats.change > 0 ? "+" : ""}
                {weightStats.change} kg
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lowest</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{weightStats.min} kg</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Highest</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{weightStats.max} kg</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weight chart */}
      {weightChartData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weight Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 12 }} unit=" kg" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* BMI chart */}
      {bmiChartData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">BMI Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={bmiChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="bmi" stroke="#82ca9d" strokeWidth={2} dot={{ fill: "#82ca9d", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Body Measurements chart */}
      {bodyChartData.length >= 2 && activeBodyMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Body Measurements Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={bodyChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit=" cm" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                {activeBodyMetrics.map((metric) => (
                  <Line
                    key={metric.key}
                    type="monotone"
                    dataKey={metric.key}
                    name={metric.label}
                    stroke={metric.color}
                    strokeWidth={2}
                    dot={{ fill: metric.color, r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {measLoading && (
        <p className="text-muted-foreground">Loading measurements...</p>
      )}

      {/* No data message */}
      {!measLoading && (!measurements || measurements.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No measurements logged yet. Log your first measurement from the
            Progress page.
          </CardContent>
        </Card>
      )}

      {/* Measurement history table */}
      {measurements && measurements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...measurements].reverse().map((m) => {
                let bmiVal: string | null = null;
                if (m.weight_kg != null && m.height_cm != null) {
                  bmiVal = (m.weight_kg / (m.height_cm / 100) ** 2).toFixed(1);
                }
                const bodyParts: string[] = [];
                if (m.bicep_cm != null) bodyParts.push(`Bicep: ${m.bicep_cm}`);
                if (m.chest_cm != null) bodyParts.push(`Chest: ${m.chest_cm}`);
                if (m.waist_cm != null) bodyParts.push(`Waist: ${m.waist_cm}`);
                if (m.hip_cm != null) bodyParts.push(`Hip: ${m.hip_cm}`);
                if (m.thigh_cm != null) bodyParts.push(`Thigh: ${m.thigh_cm}`);
                if (m.calf_cm != null) bodyParts.push(`Calf: ${m.calf_cm}`);
                if (m.forearm_cm != null) bodyParts.push(`Forearm: ${m.forearm_cm}`);
                if (m.neck_cm != null) bodyParts.push(`Neck: ${m.neck_cm}`);

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-2 text-sm"
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-muted-foreground w-28 shrink-0">
                        {new Date(m.measured_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {m.weight_kg != null && (
                        <Badge variant="outline">{m.weight_kg} kg</Badge>
                      )}
                      {m.height_cm != null && (
                        <Badge variant="secondary">{m.height_cm} cm</Badge>
                      )}
                      {bmiVal && (
                        <span className="text-xs text-muted-foreground">
                          BMI: {bmiVal}
                        </span>
                      )}
                      {bodyParts.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {bodyParts.join(" | ")}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => {
                        if (confirm("Delete this measurement?")) deleteMeasurement.mutate(m.id);
                      }}
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
      )}
    </div>
  );
}
