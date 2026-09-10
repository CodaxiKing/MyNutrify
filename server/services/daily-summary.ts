/**
 * Recalcula o resumo diário de calorias queimadas.
 *
 * A lógica vivia inline nas rotas de atividade e precisava valer também para os
 * treinos de musculação e para os passos — sem isso, o que o usuário gasta
 * caminhando ou treinando nunca chegava ao painel do dia.
 */

import { storage } from "../storage";
import { localDateKey } from "@shared/steps";

/**
 * Refaz `caloriesBurned` e `netCalories` do dia somando as atividades
 * registradas e as calorias dos passos, preservando os totais das refeições.
 */
export async function recalculateDailyBurn(userId: string, date: Date = new Date()) {
  const [existing, activities, steps] = await Promise.all([
    storage.getDailySummary(userId, date),
    storage.getActivitiesByUserAndDate(userId, date),
    storage.getDailySteps(userId, localDateKey(date)),
  ]);

  const activityCalories = activities.reduce(
    (sum, activity) => sum + activity.caloriesBurned,
    0,
  );

  // Caminhada e atividades registradas são gastos distintos. Um treino de
  // musculação vira uma `activityEntry`; os passos vêm do sensor. O risco de
  // dupla contagem existiria se o usuário registrasse uma caminhada à mão
  // além dos passos — mas subestimar o gasto é pior que somar os dois, já que
  // o app usa isso apenas como referência.
  const stepCalories = steps?.caloriesBurned ?? 0;

  const caloriesBurned = Math.round(activityCalories + stepCalories);
  const totalCalories = existing?.totalCalories ?? 0;

  return storage.upsertDailySummary({
    userId,
    date,
    totalCalories,
    totalCarbs: existing?.totalCarbs ?? 0,
    totalProtein: existing?.totalProtein ?? 0,
    totalFat: existing?.totalFat ?? 0,
    mealCount: existing?.mealCount ?? 0,
    caloriesBurned,
    netCalories: totalCalories - caloriesBurned,
  });
}
