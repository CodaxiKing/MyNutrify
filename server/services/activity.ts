// Activity tracking service with MET calculations
export interface ExerciseData {
  name: string;
  category: 'cardio' | 'strength' | 'sports' | 'flexibility';
  metValue: number;
  description?: string;
}

export interface ActivityCalculation {
  caloriesBurned: number;
  adjustedMetValue: number;
}

// Common exercises with their MET values
export const commonExercises: ExerciseData[] = [
  // Cardio
  { name: "Caminhada (moderada)", category: "cardio", metValue: 3.5, description: "Caminhada em ritmo moderado (5 km/h)" },
  { name: "Caminhada (rápida)", category: "cardio", metValue: 4.3, description: "Caminhada rápida (6 km/h)" },
  { name: "Corrida (leve)", category: "cardio", metValue: 7.0, description: "Corrida leve (8 km/h)" },
  { name: "Corrida (moderada)", category: "cardio", metValue: 8.3, description: "Corrida moderada (9 km/h)" },
  { name: "Corrida (intensa)", category: "cardio", metValue: 11.0, description: "Corrida intensa (12 km/h)" },
  { name: "Ciclismo (leve)", category: "cardio", metValue: 4.0, description: "Ciclismo recreativo (<16 km/h)" },
  { name: "Ciclismo (moderado)", category: "cardio", metValue: 6.8, description: "Ciclismo moderado (16-19 km/h)" },
  { name: "Ciclismo (intenso)", category: "cardio", metValue: 10.0, description: "Ciclismo intenso (>20 km/h)" },
  { name: "Natação (leve)", category: "cardio", metValue: 6.0, description: "Natação recreativa" },
  { name: "Natação (moderada)", category: "cardio", metValue: 8.3, description: "Natação crawl moderada" },
  { name: "Natação (intensa)", category: "cardio", metValue: 10.0, description: "Natação crawl intensa" },
  { name: "Subir escadas", category: "cardio", metValue: 8.8, description: "Subir escadas em ritmo normal" },
  
  // Strength Training
  { name: "Musculação (leve)", category: "strength", metValue: 3.0, description: "Exercícios com pesos leves" },
  { name: "Musculação (moderada)", category: "strength", metValue: 5.0, description: "Exercícios com pesos moderados" },
  { name: "Musculação (intensa)", category: "strength", metValue: 6.0, description: "Exercícios com pesos pesados" },
  { name: "Flexões", category: "strength", metValue: 4.0, description: "Exercícios de flexão" },
  { name: "Abdominais", category: "strength", metValue: 3.8, description: "Exercícios abdominais" },
  
  // Sports
  { name: "Futebol", category: "sports", metValue: 7.0, description: "Futebol recreativo" },
  { name: "Basquete", category: "sports", metValue: 6.5, description: "Basquete recreativo" },
  { name: "Tênis", category: "sports", metValue: 7.3, description: "Tênis recreativo" },
  { name: "Vôlei", category: "sports", metValue: 4.0, description: "Vôlei recreativo" },
  { name: "Dança", category: "sports", metValue: 4.8, description: "Dança aeróbica" },
  
  // Flexibility
  { name: "Yoga", category: "flexibility", metValue: 2.5, description: "Yoga Hatha" },
  { name: "Pilates", category: "flexibility", metValue: 3.0, description: "Pilates" },
  { name: "Alongamento", category: "flexibility", metValue: 2.3, description: "Exercícios de alongamento" },
];

/**
 * Calculate calories burned using MET formula
 * Formula: Calories = MET × weight (kg) × time (hours)
 */
export function calculateCaloriesBurned(
  metValue: number,
  weightKg: number,
  durationMinutes: number,
  intensity: 'light' | 'moderate' | 'vigorous' = 'moderate'
): ActivityCalculation {
  // Intensity multipliers
  const intensityMultipliers = {
    light: 0.8,
    moderate: 1.0,
    vigorous: 1.2
  };

  const adjustedMetValue = metValue * intensityMultipliers[intensity];
  const durationHours = durationMinutes / 60;
  const caloriesBurned = Math.round(adjustedMetValue * weightKg * durationHours);

  return {
    caloriesBurned,
    adjustedMetValue: Math.round(adjustedMetValue * 10) / 10 // Round to 1 decimal
  };
}

/**
 * Find exercises by name or category
 */
export function searchExercises(query: string, category?: string): ExerciseData[] {
  const lowerQuery = query.toLowerCase();
  
  return commonExercises.filter(exercise => {
    const matchesName = exercise.name.toLowerCase().includes(lowerQuery);
    const matchesDescription = exercise.description?.toLowerCase().includes(lowerQuery) || false;
    const matchesCategory = !category || exercise.category === category;
    
    return (matchesName || matchesDescription) && matchesCategory;
  });
}

/**
 * Get exercises by category
 */
export function getExercisesByCategory(category: 'cardio' | 'strength' | 'sports' | 'flexibility'): ExerciseData[] {
  return commonExercises.filter(exercise => exercise.category === category);
}

/**
 * Calculate net calories (consumed - burned)
 */
export function calculateNetCalories(consumed: number, burned: number): number {
  return consumed - burned;
}

/**
 * Validate activity entry data
 */
export function validateActivityData(data: {
  duration: number;
  intensity: string;
  caloriesBurned: number;
}): string[] {
  const errors: string[] = [];

  if (data.duration < 1 || data.duration > 1440) {
    errors.push("Duração deve estar entre 1 minuto e 24 horas");
  }

  if (!['light', 'moderate', 'vigorous'].includes(data.intensity)) {
    errors.push("Intensidade deve ser 'light', 'moderate' ou 'vigorous'");
  }

  if (data.caloriesBurned < 0 || data.caloriesBurned > 2000) {
    errors.push("Calorias gastas devem estar entre 0 e 2000");
  }

  return errors;
}