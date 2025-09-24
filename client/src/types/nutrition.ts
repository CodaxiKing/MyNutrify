import { PlanTier } from '@shared/plans';

export interface UserProfile {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: 'male' | 'female';
  fitnessGoal: 'lose' | 'maintain' | 'gain';
  bmr?: number;
  dailyCalorieGoal?: number;
  plan?: PlanTier;
}

export interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodAnalysis {
  foodId?: string;
  name: string;
  confidence: number;
  calories: number;
  servingSize: string;
  macronutrients: {
    carbs: number;
    protein: number;
    fat: number;
  };
  description?: string;
}

export interface MealEntry {
  id?: string;
  userId?: string;
  foodId?: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  date: Date;
  quantity: number;
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  foodName?: string;
}

export interface DailySummary {
  id?: string;
  userId?: string;
  date: Date;
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  mealCount: number;
  caloriesBurned?: number;
  netCalories?: number;
}

export interface NutritionTotals {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface CalendarDay {
  date: Date;
  calories?: number;
  status?: 'under' | 'target' | 'over' | 'none';
}

export interface WeeklyData {
  date: string;
  calories: number;
  day: string;
}

export interface Exercise {
  id?: string;
  name: string;
  category: 'cardio' | 'strength' | 'sports' | 'flexibility';
  metValue: number;
  description?: string;
  createdAt?: Date;
}

export interface ActivityEntry {
  id?: string;
  userId?: string;
  exerciseId?: string;
  customExerciseName?: string;
  duration: number; // minutes
  intensity: 'light' | 'moderate' | 'vigorous';
  caloriesBurned: number;
  date: Date;
  notes?: string;
  createdAt?: Date;
  exercise?: Exercise;
}
