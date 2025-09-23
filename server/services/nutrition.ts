export interface BMRCalculationParams {
  weight: number; // kg
  height: number; // cm
  age: number; // years
  gender: 'male' | 'female';
}

export interface CalorieGoalParams extends BMRCalculationParams {
  fitnessGoal: 'lose' | 'maintain' | 'gain';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation
 * This is the most accurate formula for BMR calculation
 */
export function calculateBMR(params: BMRCalculationParams): number {
  const { weight, height, age, gender } = params;
  
  // Mifflin-St Jeor Equation
  // Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
  // Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
  
  const baseBMR = 10 * weight + 6.25 * height - 5 * age;
  const bmr = gender === 'male' ? baseBMR + 5 : baseBMR - 161;
  
  return Math.round(bmr);
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 * BMR multiplied by activity factor
 */
export function calculateTDEE(bmr: number, activityLevel: string = 'light'): number {
  const activityMultipliers = {
    sedentary: 1.2,      // Little or no exercise
    light: 1.375,        // Light exercise 1-3 days/week
    moderate: 1.55,      // Moderate exercise 3-5 days/week
    active: 1.725,       // Hard exercise 6-7 days/week
    very_active: 1.9     // Very hard exercise, physical job
  };
  
  const multiplier = activityMultipliers[activityLevel as keyof typeof activityMultipliers] || activityMultipliers.light;
  return Math.round(bmr * multiplier);
}

/**
 * Calculate daily calorie goal based on fitness objective
 */
export function calculateDailyCalorieGoal(params: CalorieGoalParams): number {
  const bmr = calculateBMR(params);
  const tdee = calculateTDEE(bmr, params.activityLevel);
  
  // Adjust based on fitness goal
  switch (params.fitnessGoal) {
    case 'lose':
      // Create 500 calorie deficit for 1 lb/week loss
      return Math.max(1200, tdee - 500); // Don't go below 1200 for safety
    case 'gain':
      // Create 300-500 calorie surplus for muscle gain
      return tdee + 400;
    case 'maintain':
    default:
      return tdee;
  }
}

/**
 * Calculate recommended macronutrient distribution
 */
export function calculateMacroTargets(totalCalories: number, fitnessGoal: string) {
  let proteinPercent, carbPercent, fatPercent;
  
  switch (fitnessGoal) {
    case 'lose':
      // Higher protein for weight loss (30/35/35)
      proteinPercent = 0.30;
      carbPercent = 0.35;
      fatPercent = 0.35;
      break;
    case 'gain':
      // Higher carbs for muscle gain (25/45/30)
      proteinPercent = 0.25;
      carbPercent = 0.45;
      fatPercent = 0.30;
      break;
    case 'maintain':
    default:
      // Balanced macro split (25/45/30)
      proteinPercent = 0.25;
      carbPercent = 0.45;
      fatPercent = 0.30;
      break;
  }
  
  return {
    protein: Math.round((totalCalories * proteinPercent) / 4), // 4 cal/g protein
    carbs: Math.round((totalCalories * carbPercent) / 4),     // 4 cal/g carbs
    fat: Math.round((totalCalories * fatPercent) / 9),        // 9 cal/g fat
  };
}

/**
 * Calculate nutrition totals for a collection of meals
 */
export function calculateNutritionTotals(meals: Array<{
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
}>) {
  return meals.reduce(
    (totals, meal) => ({
      calories: totals.calories + (meal.totalCalories || 0),
      carbs: totals.carbs + (meal.totalCarbs || 0),
      protein: totals.protein + (meal.totalProtein || 0),
      fat: totals.fat + (meal.totalFat || 0),
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0 }
  );
}

/**
 * Validate nutrition calculation parameters
 */
export function validateNutritionParams(params: CalorieGoalParams): string[] {
  const errors: string[] = [];
  
  if (!params.weight || params.weight < 30 || params.weight > 300) {
    errors.push("Weight must be between 30 and 300 kg");
  }
  
  if (!params.height || params.height < 100 || params.height > 250) {
    errors.push("Height must be between 100 and 250 cm");
  }
  
  if (!params.age || params.age < 13 || params.age > 120) {
    errors.push("Age must be between 13 and 120 years");
  }
  
  if (!['male', 'female'].includes(params.gender)) {
    errors.push("Gender must be either 'male' or 'female'");
  }
  
  if (!['lose', 'maintain', 'gain'].includes(params.fitnessGoal)) {
    errors.push("Fitness goal must be 'lose', 'maintain', or 'gain'");
  }
  
  return errors;
}
