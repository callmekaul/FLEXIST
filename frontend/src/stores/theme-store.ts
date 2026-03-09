"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GymTheme } from "@/types";

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const lr = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const lg = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const lb = b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l = Math.cbrt(l_);
  const m = Math.cbrt(m_);
  const s = Math.cbrt(s_);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bVal = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const C = Math.sqrt(a * a + bVal * bVal);
  let h = (Math.atan2(bVal, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return [L, C, h];
}

function hexToOklch(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const [L, C, h] = rgbToOklch(r, g, b);
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${h.toFixed(1)})`;
}

/** Adjust lightness of an oklch color */
function adjustL(hex: string, targetL: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [, C, h] = rgbToOklch(r, g, b);
  return `oklch(${targetL.toFixed(3)} ${C.toFixed(3)} ${h.toFixed(1)})`;
}

/** Create a muted version (low chroma) */
function muted(hex: string, targetL: number, chromaScale = 0.15): string {
  const [r, g, b] = hexToRgb(hex);
  const [, C, h] = rgbToOklch(r, g, b);
  return `oklch(${targetL.toFixed(3)} ${(C * chromaScale).toFixed(3)} ${h.toFixed(1)})`;
}

function isDark(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  const [L] = rgbToOklch(r, g, b);
  return L < 0.5;
}

interface ThemeState {
  gymTheme: GymTheme | null;
  setGymTheme: (theme: GymTheme) => void;
  clearTheme: () => void;
  applyThemeToDOM: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      gymTheme: null,

      setGymTheme: (theme) => {
        set({ gymTheme: theme });
        get().applyThemeToDOM();
      },

      clearTheme: () => {
        set({ gymTheme: null });
        const root = document.documentElement;
        const vars = [
          "--primary", "--primary-foreground",
          "--secondary", "--secondary-foreground",
          "--accent", "--accent-foreground",
          "--background", "--foreground",
          "--card", "--card-foreground",
          "--popover", "--popover-foreground",
          "--muted", "--muted-foreground",
          "--border", "--input", "--ring",
          "--sidebar", "--sidebar-foreground",
          "--sidebar-primary", "--sidebar-primary-foreground",
          "--sidebar-accent", "--sidebar-accent-foreground",
          "--sidebar-border", "--sidebar-ring",
        ];
        vars.forEach((v) => root.style.removeProperty(v));
      },

      applyThemeToDOM: () => {
        const { gymTheme } = get();
        if (!gymTheme) return;
        const root = document.documentElement;
        const dark = isDark(gymTheme.background_color);

        // Core colors
        root.style.setProperty("--primary", hexToOklch(gymTheme.primary_color));
        root.style.setProperty("--primary-foreground", dark
          ? adjustL(gymTheme.primary_color, 0.15)
          : adjustL(gymTheme.primary_color, 0.98));
        root.style.setProperty("--secondary", hexToOklch(gymTheme.secondary_color));
        root.style.setProperty("--secondary-foreground", dark
          ? adjustL(gymTheme.secondary_color, 0.98)
          : adjustL(gymTheme.secondary_color, 0.15));
        root.style.setProperty("--accent", hexToOklch(gymTheme.accent_color));
        root.style.setProperty("--accent-foreground", dark
          ? adjustL(gymTheme.accent_color, 0.98)
          : adjustL(gymTheme.accent_color, 0.15));

        // Background & foreground
        root.style.setProperty("--background", hexToOklch(gymTheme.background_color));
        root.style.setProperty("--foreground", hexToOklch(gymTheme.foreground_color));

        // Card — slightly lighter/darker than background
        const bgL = rgbToOklch(...hexToRgb(gymTheme.background_color))[0];
        const cardL = dark ? Math.min(bgL + 0.06, 0.95) : Math.max(bgL - 0.02, 0.05);
        root.style.setProperty("--card", muted(gymTheme.background_color, cardL, 0.3));
        root.style.setProperty("--card-foreground", hexToOklch(gymTheme.foreground_color));

        // Popover — same as card
        root.style.setProperty("--popover", muted(gymTheme.background_color, cardL, 0.3));
        root.style.setProperty("--popover-foreground", hexToOklch(gymTheme.foreground_color));

        // Muted
        const mutedL = dark ? bgL + 0.12 : bgL - 0.03;
        root.style.setProperty("--muted", muted(gymTheme.primary_color, mutedL, 0.08));
        root.style.setProperty("--muted-foreground", muted(gymTheme.foreground_color, dark ? 0.71 : 0.55, 0.05));

        // Border, input, ring
        root.style.setProperty("--border", dark
          ? `oklch(1 0 0 / 10%)`
          : muted(gymTheme.primary_color, 0.92, 0.05));
        root.style.setProperty("--input", dark
          ? `oklch(1 0 0 / 15%)`
          : muted(gymTheme.primary_color, 0.92, 0.05));
        root.style.setProperty("--ring", adjustL(gymTheme.primary_color, dark ? 0.55 : 0.7));

        // Sidebar — derived from primary + background
        const sidebarL = dark ? bgL + 0.06 : bgL - 0.015;
        root.style.setProperty("--sidebar", muted(gymTheme.primary_color, sidebarL, 0.15));
        root.style.setProperty("--sidebar-foreground", hexToOklch(gymTheme.foreground_color));
        root.style.setProperty("--sidebar-primary", hexToOklch(gymTheme.primary_color));
        root.style.setProperty("--sidebar-primary-foreground", dark
          ? adjustL(gymTheme.primary_color, 0.98)
          : adjustL(gymTheme.primary_color, 0.98));
        const sidebarAccentL = dark ? sidebarL + 0.06 : sidebarL - 0.03;
        root.style.setProperty("--sidebar-accent", muted(gymTheme.primary_color, sidebarAccentL, 0.12));
        root.style.setProperty("--sidebar-accent-foreground", hexToOklch(gymTheme.foreground_color));
        root.style.setProperty("--sidebar-border", dark
          ? `oklch(1 0 0 / 10%)`
          : muted(gymTheme.primary_color, 0.92, 0.05));
        root.style.setProperty("--sidebar-ring", adjustL(gymTheme.primary_color, dark ? 0.55 : 0.7));
      },
    }),
    {
      name: "flexist-theme",
    },
  ),
);
