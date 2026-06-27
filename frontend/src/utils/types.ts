export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';
export type Formula = 'harris_benedict' | 'mifflin_st_jeor';

export interface User {
  id: number;
  email: string;
  name: string;
  sex?: Sex | null;
  birth_date?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  activity_level?: ActivityLevel;
  goal?: Goal;
  formula?: Formula;
}

export interface PlanExercise {
  id?: number;
  exercise_name?: string;
  exerciseName?: string;
  target_sets?: number;
  targetSets?: number;
  target_reps?: string;
  targetReps?: string;
  notes?: string;
  variants?: string[];
  position?: number;
}

export interface WorkoutPlan {
  id: number;
  name: string;
  description?: string | null;
  day_of_week?: number | null;
  rest_seconds?: number;
  exercises: PlanExercise[];
  created_at?: string;
}

export interface SessionEntry {
  id?: number;
  exercise_name?: string;
  exerciseName?: string;
  set_number?: number;
  setNumber?: number;
  reps: number;
  weight_kg?: number;
  weightKg?: number;
  rpe?: number;
}

export interface WorkoutSession {
  id: number;
  plan_id?: number | null;
  plan_name?: string | null;
  session_date: string;
  notes?: string | null;
  entries: SessionEntry[];
}

export interface CalorieResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  formula: Formula;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface WeightLog {
  id: number;
  log_date: string;
  weight_kg: number;
}

export interface ExerciseProgressPoint {
  date: string;
  maxWeight: number;
  maxReps: number;
}

export interface ExerciseHistoryEntry {
  id: number;
  session_id: number;
  session_date: string | null;
  exercise_name: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  rpe: number | null;
}
