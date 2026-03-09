"use client";

import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import type { User, UserRole } from "@/types";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
  ) => Promise<{ needsEmailVerification: boolean }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,

  setSession: (session) => set({ session }),

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    set({ session: data.session });
    await get().refreshUser();
  },

  signUp: async (email, password, fullName, role) => {
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;

    // Supabase returns empty identities if user already exists (email enumeration protection)
    if (!data.user || data.user.identities?.length === 0) {
      throw new Error("An account with this email already exists. Try signing in.");
    }

    set({ session: data.session });

    // Create backend profile
    await api.post("/api/auth/register-profile", {
      supabase_uid: data.user.id,
      email,
      full_name: fullName,
      role,
    });

    // If no session (email confirmation enabled), don't try to refresh
    if (data.session) {
      await get().refreshUser();
      return { needsEmailVerification: false };
    }
    return { needsEmailVerification: true };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  refreshUser: async () => {
    try {
      const { data } = await api.get("/api/auth/me");
      set({ user: data, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },
}));
