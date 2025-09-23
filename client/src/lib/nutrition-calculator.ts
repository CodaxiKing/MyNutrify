export interface BMRParams {
  weight: number; // kg
  height: number; // cm
  age: number;
  gender: 'male' | 'female';
}

export interface CalorieGoalParams extends BMRParams {
  fitnessGoal: 'lose' | 'maintain' | 'gain';
  activityLevel?: string;
}

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
export function calculateBMR(params: BMRParams): number {
  const { weight, height, age, gender } = params;
  const baseBMR = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? baseBMR + 5 : baseBMR - 161;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(bmr: number, activityLevel: string = 'light'): number {
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };
  return bmr * (multipliers[activityLevel as keyof typeof multipliers] || multipliers.light);
}

/**
 * Calculate daily calorie goal based on fitness objective
 */
export function calculateDailyCalorieGoal(params: CalorieGoalParams): number {
  const bmr = calculateBMR(params);
  const tdee = calculateTDEE(bmr, params.activityLevel);
  
  switch (params.fitnessGoal) {
    case 'lose':
      return Math.max(1200, tdee - 500);
    case 'gain':
      return tdee + 400;
    case 'maintain':
    default:
      return tdee;
  }
}

/**
 * Calculate macro targets based on total calories and goal
 */
export function calculateMacroTargets(totalCalories: number, fitnessGoal: string) {
  let proteinPercent, carbPercent, fatPercent;
  
  switch (fitnessGoal) {
    case 'lose':
      proteinPercent = 0.30;
      carbPercent = 0.35;
      fatPercent = 0.35;
      break;
    case 'gain':
      proteinPercent = 0.25;
      carbPercent = 0.45;
      fatPercent = 0.30;
      break;
    case 'maintain':
    default:
      proteinPercent = 0.25;
      carbPercent = 0.45;
      fatPercent = 0.30;
      break;
  }
  
  return {
    protein: Math.round((totalCalories * proteinPercent) / 4),
    carbs: Math.round((totalCalories * carbPercent) / 4),
    fat: Math.round((totalCalories * fatPercent) / 9),
  };
}

/**
 * Calculate progress percentage for macros
 */
export function calculateMacroProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

/**
 * Format calories for display
 */
export function formatCalories(calories: number): string {
  return Math.round(calories).toLocaleString();
}

/**
 * Format macros for display
 */
export function formatMacros(grams: number): string {
  return Math.round(grams) + 'g';
}
