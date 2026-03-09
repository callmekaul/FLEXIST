"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { IExerciseData } from "react-body-highlighter";

// Dynamic import to avoid SSR issues with SVG-heavy component
const Model = dynamic(() => import("react-body-highlighter"), { ssr: false });

type MuscleIntensity = Record<string, number>;

interface MuscleMapProps {
  muscles: MuscleIntensity;
  female?: boolean;
  className?: string;
}

// Map our detailed muscle names → react-body-highlighter slugs
const MUSCLE_SLUG_MAP: Record<string, string> = {
  // Chest
  "Upper Pectoralis": "chest",
  "Mid and Lower Chest": "chest",
  // Shoulders
  "Anterior Deltoid": "front-deltoids",
  "Lateral Deltoid": "front-deltoids",
  "Posterior Deltoid": "back-deltoids",
  // Back
  "Lats": "upper-back",
  "Upper Traps": "trapezius",
  "Lower Traps": "trapezius",
  "Lower Back": "lower-back",
  // Arms
  "Short Head Bicep": "biceps",
  "Long Head Bicep": "biceps",
  "Long Head Tricep": "triceps",
  "Lateral Head Triceps": "triceps",
  "Medial Head Triceps": "triceps",
  "Wrist Flexors": "forearm",
  "Wrist Extensors": "forearm",
  // Core
  "Upper Abdominals": "abs",
  "Lower Abdominals": "abs",
  "Obliques": "obliques",
  // Legs
  "Rectus Femoris": "quadriceps",
  "Inner Quadriceps": "quadriceps",
  "Outer Quadricep": "quadriceps",
  "Inner Thigh": "adductor",
  "Medial Hamstrings": "hamstring",
  "Lateral Hamstrings": "hamstring",
  "Gluteus Maximus": "gluteal",
  "Gluteus Medius": "abductors",
  // Lower leg
  "Gastrocnemius": "calves",
  "Soleus": "left-soleus",
  "Tibialis": "calves",
  // Other
  "Neck": "neck",
};

/**
 * Convert our detailed muscle intensity map into the IExerciseData[]
 * format that react-body-highlighter expects.
 *
 * The library uses `frequency` (how many exercises hit a muscle) to
 * determine color intensity. We group by slug and sum up the intensity.
 */
function toExerciseData(muscles: MuscleIntensity): IExerciseData[] {
  const slugCounts: Record<string, { freq: number; names: string[] }> = {};

  for (const [muscle, intensity] of Object.entries(muscles)) {
    const slug = MUSCLE_SLUG_MAP[muscle];
    if (!slug) continue;
    if (!slugCounts[slug]) slugCounts[slug] = { freq: 0, names: [] };
    slugCounts[slug].freq += intensity;
    slugCounts[slug].names.push(muscle);
  }

  return Object.entries(slugCounts).map(([slug, { freq, names }]) => ({
    name: names.join(", "),
    muscles: [slug] as IExerciseData["muscles"],
    frequency: freq,
  }));
}

function getColor(intensity: number): string {
  if (intensity <= 0) return "currentColor";
  if (intensity === 1) return "hsl(200, 80%, 55%)";
  if (intensity === 2) return "hsl(30, 90%, 55%)";
  return "hsl(0, 80%, 50%)";
}

export function calculateMuscleIntensity(
  exercises: { muscle_groups?: string[] }[],
): MuscleIntensity {
  const counts: Record<string, number> = {};
  for (const ex of exercises) {
    if (!ex.muscle_groups?.length) continue;
    ex.muscle_groups.forEach((muscle, i) => {
      counts[muscle] = (counts[muscle] || 0) + (i === 0 ? 2 : 1);
    });
  }
  const values = Object.values(counts);
  if (values.length === 0) return {};
  const max = Math.max(...values);
  const result: MuscleIntensity = {};
  for (const [muscle, count] of Object.entries(counts)) {
    const n = count / max;
    if (n > 0.66) result[muscle] = 3;
    else if (n > 0.33) result[muscle] = 2;
    else result[muscle] = 1;
  }
  return result;
}

export function MuscleMap({ muscles, className }: MuscleMapProps) {
  const data = useMemo(() => toExerciseData(muscles), [muscles]);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="grid grid-cols-2 gap-2 w-full">
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground mb-1">Front</span>
          <Model
            data={data}
            style={{ width: "100%", maxWidth: "12rem" }}
            type="anterior"
            highlightedColors={["#5ba4d9", "#e89040", "#d94040"]}
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground mb-1">Back</span>
          <Model
            data={data}
            style={{ width: "100%", maxWidth: "12rem" }}
            type="posterior"
            highlightedColors={["#5ba4d9", "#e89040", "#d94040"]}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-xs text-muted-foreground">
        {([1, 2, 3] as const).map((i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: getColor(i) }} />
            <span>{["", "Light", "Moderate", "Primary"][i]}</span>
          </div>
        ))}
      </div>

      {/* Active muscles list */}
      {Object.keys(muscles).length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center max-w-xs">
          {Object.entries(muscles)
            .sort((a, b) => b[1] - a[1])
            .map(([name, intensity]) => (
              <span
                key={name}
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{
                  borderColor: getColor(intensity),
                  color: getColor(intensity),
                }}
              >
                {name}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
