"use client";

import { useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore } from "@/stores/theme-store";
import { useGymStore } from "@/stores/gym-store";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      useAuthStore.getState().setSession(session);
      if (session) {
        useAuthStore.getState().refreshUser();
        useGymStore.getState().fetchMyGym();
      }
    });

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      useAuthStore.getState().setSession(session);
      if (session) {
        useAuthStore.getState().refreshUser();
        useGymStore.getState().fetchMyGym();
      } else {
        useAuthStore.setState({ isLoading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Re-apply theme on mount (from persisted state)
  const gymTheme = useThemeStore((s) => s.gymTheme);
  useEffect(() => {
    if (gymTheme) {
      useThemeStore.getState().applyThemeToDOM();
    }
  }, [gymTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
