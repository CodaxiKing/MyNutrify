/** Portuguese food search: Brazilian reference foods first, then saved foods and local products. */
import type { Food, InsertFood } from "@shared/schema";
import { storage } from "../storage";
import { searchTaco, tacoToFood } from "./taco";
import { openFoodFactsService } from "./openfoodfacts";
import { normalizeFoodText } from "../../shared/food-search";

export type FoodSource = "local" | "taco" | "openfoodfacts" | "usda" | "ai" | "manual";

function dedupeKey(food: { name: string; caloriesPerServing: number; servingSize: string }): string {
  return `${normalizeFoodText(food.name)}|${food.servingSize}|${Math.round(food.caloriesPerServing)}`;
}
async function persist(food: InsertFood): Promise<Food | null> {
  try { return await storage.createFood(food); }
  catch (error) {
    if (food.barcode) {
      const existing = await storage.getFoodByBarcode(food.barcode);
      if (existing) return { ...existing, name: food.name };
    }
    console.error("Não foi possível salvar o alimento externo:", error);
    return null;
  }
}
export async function searchFoods(query: string, limit: number): Promise<Food[]> {
  const local = await storage.searchFoods(query, limit);
  const byKey = new Map(local.map(food => [dedupeKey(food), food]));
  const seen = new Set<string>();
  const results: Food[] = [];
  // Always consult TACO: old cached results must not hide Brazilian foods.
  for (const candidate of searchTaco(query, limit).map(tacoToFood)) {
    const key = dedupeKey(candidate);
    if (seen.has(key)) continue;
    const saved = byKey.get(key) ?? await persist(candidate);
    if (saved) { seen.add(key); results.push(saved); }
  }
  for (const food of local) {
    if (results.length >= limit) break;
    const key = dedupeKey(food);
    if (!seen.has(key)) { seen.add(key); results.push(food); }
  }
  if (results.length >= limit) return results.slice(0, limit);
  // USDA descriptions have no Portuguese field; keep them out of this search.
  const products = await openFoodFactsService.searchByName(query, limit - results.length).catch(() => []);
  for (const candidate of products) {
    if (results.length >= limit) break;
    const key = dedupeKey(candidate);
    if (seen.has(key)) continue;
    const saved = await persist(candidate);
    if (saved) { seen.add(key); results.push(saved); }
  }
  return results;
}
