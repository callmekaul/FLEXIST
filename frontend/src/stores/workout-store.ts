"use client";

import { create } from "zustand";
import api from "@/lib/api";
import { localISOString } from "@/lib/utils";
import type { ExerciseType } from "@/types";

interface ExerciseLogInput {
  exercise_id: string;
  exercise_type: ExerciseType;
  order: number;
  set_number?: number;
  reps?: number;
  weight_kg?: number;
  duration_seconds?: number;
  distance_km?: number;
  notes?: string;
}

interface ActiveWorkout {
  plan_id?: string;
  started_at: string;
  entries: ExerciseLogInput[];
}

interface WorkoutState {
  activeWorkout: ActiveWorkout | null;
  startWorkout: (planId?: string) => void;
  addEntry: (entry: ExerciseLogInput) => void;
  removeEntry: (index: number) => void;
  finishWorkout: (
    notes?: string,
    rating?: number,
  ) => Promise<string | null>;
  cancelWorkout: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeWorkout: null,

  startWorkout: (planId) => {
    set({
      activeWorkout: {
        plan_id: planId,
        started_at: localISOString(),
        entries: [],
      },
    });
  },

  addEntry: (entry) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;
    set({
      activeWorkout: {
        ...activeWorkout,
        entries: [...activeWorkout.entries, entry],
      },
    });
  },

  removeEntry: (index) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;
    set({
      activeWorkout: {
        ...activeWorkout,
        entries: activeWorkout.entries.filter((_, i) => i !== index),
      },
    });
  },

  finishWorkout: async (notes, rating) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return null;

    const { data: log } = await api.post("/api/workouts/logs", {
      plan_id: activeWorkout.plan_id || null,
      started_at: activeWorkout.started_at,
      completed_at: localISOString(),
      notes: notes || null,
      rating: rating || null,
    });

    if (activeWorkout.entries.length > 0) {
      await api.post(`/api/workouts/logs/${log.id}/exercises`, activeWorkout.entries);
    }

    set({ activeWorkout: null });
    return log.id;
  },

  cancelWorkout: () => set({ activeWorkout: null }),
}));
