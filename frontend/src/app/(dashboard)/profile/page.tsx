"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import api from "@/lib/api";
import { toast } from "sonner";
import type { ExperienceLevel } from "@/types";

const GOAL_OPTIONS = [
  "Lose Weight",
  "Build Muscle",
  "Improve Endurance",
  "Increase Strength",
  "Flexibility",
  "General Fitness",
];

const DIET_OPTIONS = [
  "No Restrictions",
  "Vegetarian",
  "Vegan",
  "Keto",
  "Gluten Free",
  "Dairy Free",
];

export default function ProfilePage() {
  const { user, refreshUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [age, setAge] = useState(user?.age?.toString() || "");
  const [weightKg, setWeightKg] = useState(user?.weight_kg?.toString() || "");
  const [heightCm, setHeightCm] = useState(user?.height_cm?.toString() || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [experienceLevel, setExperienceLevel] = useState<string>(
    user?.experience_level || "",
  );
  const [fitnessGoals, setFitnessGoals] = useState<string[]>(
    user?.fitness_goals || [],
  );
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(
    user?.dietary_preferences || [],
  );

  const toggleGoal = (goal: string) => {
    setFitnessGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  };

  const toggleDiet = (pref: string) => {
    setDietaryPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch("/api/users/me", {
        full_name: fullName,
        age: age ? parseInt(age) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        gender: gender || null,
        experience_level: (experienceLevel as ExperienceLevel) || null,
        fitness_goals: fitnessGoals,
        dietary_preferences: dietaryPreferences,
      });
      await refreshUser();
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Update your details for personalized AI recommendations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Physical Details</CardTitle>
            <CardDescription>
              Used for BMI calculations and workout intensity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Experience Level</Label>
              <Select
                value={experienceLevel}
                onValueChange={setExperienceLevel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fitness Goals</CardTitle>
            <CardDescription>Select all that apply.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((goal) => (
                <Button
                  key={goal}
                  type="button"
                  variant={fitnessGoals.includes(goal) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleGoal(goal)}
                >
                  {goal}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dietary Preferences</CardTitle>
            <CardDescription>
              Used for AI diet plan generation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {DIET_OPTIONS.map((pref) => (
                <Button
                  key={pref}
                  type="button"
                  variant={
                    dietaryPreferences.includes(pref) ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => toggleDiet(pref)}
                >
                  {pref}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </div>
  );
}
