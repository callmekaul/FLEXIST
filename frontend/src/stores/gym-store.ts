"use client";

import { create } from "zustand";
import api from "@/lib/api";
import type { Gym, GymTheme } from "@/types";
import { useThemeStore } from "./theme-store";

interface GymState {
  currentGym: Gym | null;
  isLoading: boolean;
  fetchMyGym: () => Promise<void>;
  setCurrentGym: (gym: Gym | null) => void;
}

export const useGymStore = create<GymState>((set) => ({
  currentGym: null,
  isLoading: false,

  fetchMyGym: async () => {
    set({ isLoading: true });
    try {
      const { data: gym } = await api.get("/api/memberships/my-gym");
      set({ currentGym: gym, isLoading: false });

      if (gym) {
        // Fetch and apply gym theme
        const { data: theme } = await api.get<GymTheme>(
          `/api/gyms/${gym.id}/theme`,
        );
        useThemeStore.getState().setGymTheme(theme);
      } else {
        useThemeStore.getState().clearTheme();
      }
    } catch {
      set({ currentGym: null, isLoading: false });
    }
  },

  setCurrentGym: (gym) => set({ currentGym: gym }),
}));
