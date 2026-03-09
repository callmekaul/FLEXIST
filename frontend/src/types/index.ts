export type UserRole = "client" | "gym_owner";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type ExerciseType = "sets_reps" | "time_based";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  gender: string | null;
  experience_level: ExperienceLevel | null;
  fitness_goals: string[];
  dietary_preferences: string[];
}

export interface Gym {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  is_approved: boolean;
}

export interface GymTheme {
  gym_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  foreground_color: string;
}

export interface GymEquipment {
  id: string;
  equipment_id: string;
  equipment_name: string;
  category: string;
  quantity: number;
  notes: string | null;
}

export type MembershipStatus = "pending" | "approved" | "rejected";

export interface GymMembership {
  id: string;
  user_id: string;
  gym_id: string;
  status: MembershipStatus;
  is_active: boolean;
}

export interface GymMemberWithUser {
  id: string;
  user_id: string;
  gym_id: string;
  status: MembershipStatus;
  is_active: boolean;
  user_email: string;
  user_full_name: string;
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_ai_generated: boolean;
  ai_reasoning: string | null;
  created_at: string;
}

export interface WorkoutPlanExercise {
  id: string;
  exercise_id: string;
  exercise_name: string | null;
  exercise_type: string | null;
  muscle_groups: string[];
  day_of_week: number;
  order: number;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
  target_duration_seconds: number | null;
  target_distance_km: number | null;
  rest_seconds: number | null;
  notes: string | null;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  plan_id: string | null;
  day_of_week: number | null;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  rating: number | null;
  created_at: string;
}

export interface ExerciseLogEntry {
  id: string;
  workout_log_id: string;
  exercise_id: string;
  exercise_name: string | null;
  exercise_type: ExerciseType;
  muscle_groups: string[];
  order: number;
  set_number: number | null;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_km: number | null;
  is_personal_record: boolean;
  notes: string | null;
  logged_at: string;
}

export interface DietPlan {
  id: string;
  user_id: string;
  title: string;
  target_calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  meals: Record<string, unknown>;
  ai_reasoning: string | null;
  is_ai_generated: boolean;
  created_at: string;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  weight_kg: number | null;
  height_cm: number | null;
  bicep_cm: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  thigh_cm: number | null;
  calf_cm: number | null;
  forearm_cm: number | null;
  neck_cm: number | null;
  measured_at: string;
  notes: string | null;
}

export interface Exercise {
  id: string;
  name: string;
  exercise_type: ExerciseType;
  muscle_groups: string[];
  equipment_id: string | null;
  description: string | null;
}
