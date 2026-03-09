"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore } from "@/stores/theme-store";
import { toast } from "sonner";
import type { Gym, GymTheme } from "@/types";

export default function BrandingPage() {
  const { user } = useAuthStore();
  const { setGymTheme } = useThemeStore();

  const { data: gyms } = useQuery<Gym[]>({
    queryKey: ["my-gyms"],
    queryFn: () => api.get("/api/gyms").then((r) => r.data),
  });
  const myGym = gyms?.find((g) => g.owner_id === user?.id);

  const { data: currentTheme } = useQuery<GymTheme>({
    queryKey: ["gym-theme", myGym?.id],
    queryFn: () =>
      api.get(`/api/gyms/${myGym?.id}/theme`).then((r) => r.data),
    enabled: !!myGym,
  });

  const [primary, setPrimary] = useState(
    currentTheme?.primary_color || "#6366f1",
  );
  const [secondary, setSecondary] = useState(
    currentTheme?.secondary_color || "#8b5cf6",
  );
  const [accent, setAccent] = useState(
    currentTheme?.accent_color || "#f59e0b",
  );
  const [background, setBackground] = useState(
    currentTheme?.background_color || "#09090b",
  );
  const [foreground, setForeground] = useState(
    currentTheme?.foreground_color || "#fafafa",
  );
  const [loading, setLoading] = useState(false);

  // Live preview: apply theme as user changes colors
  const previewTheme = () => {
    if (!myGym) return;
    setGymTheme({
      gym_id: myGym.id,
      primary_color: primary,
      secondary_color: secondary,
      accent_color: accent,
      background_color: background,
      foreground_color: foreground,
    });
  };

  const handleSave = async () => {
    if (!myGym) return;
    setLoading(true);
    try {
      const { data } = await api.put(`/api/gyms/${myGym.id}/theme`, {
        primary_color: primary,
        secondary_color: secondary,
        accent_color: accent,
        background_color: background,
        foreground_color: foreground,
      });
      setGymTheme(data);
      toast.success("Theme saved successfully!");
    } catch {
      toast.error("Failed to save theme.");
    } finally {
      setLoading(false);
    }
  };

  if (!myGym) {
    return <p className="text-muted-foreground">No gym found.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Branding</h1>
        <p className="text-muted-foreground">
          Customize how your gym appears to members. Colors apply to their
          entire app experience.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theme Colors</CardTitle>
          <CardDescription>
            Pick colors that match your gym&apos;s brand. Changes preview live.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  onBlur={previewTheme}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  onBlur={previewTheme}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secondary</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={secondary}
                  onChange={(e) => setSecondary(e.target.value)}
                  onBlur={previewTheme}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  value={secondary}
                  onChange={(e) => setSecondary(e.target.value)}
                  onBlur={previewTheme}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  onBlur={previewTheme}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  onBlur={previewTheme}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Background</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  onBlur={previewTheme}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  onBlur={previewTheme}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Foreground (Text)</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={foreground}
                onChange={(e) => setForeground(e.target.value)}
                onBlur={previewTheme}
                className="h-10 w-14 cursor-pointer p-1"
              />
              <Input
                value={foreground}
                onChange={(e) => setForeground(e.target.value)}
                onBlur={previewTheme}
                className="flex-1"
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Theme"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
