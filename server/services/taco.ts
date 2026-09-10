/**
 * Tabela Brasileira de Composição de Alimentos (TACO).
 *
 * Base local, sem rede: 591 alimentos brasileiros preparados — arroz cozido,
 * feijão, farofa, pão de queijo. É a fonte que cobre o buraco do OpenFoodFacts,
 * que só conhece produto com código de barras.
 *
 * Todos os valores da TACO são por 100 g de parte comestível.
 * Regenerada por `npm run taco:build`.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { InsertFood } from "@shared/schema";
import { normalizeFoodText, foodSearchTerms } from "../../shared/food-search";

export interface TacoFood {
  id: string;
  name: string;
  category: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sodium: number | null;
}

const DB_PATH = resolve(process.cwd(), "shared/taco-db.json");

const FOODS: TacoFood[] = JSON.parse(readFileSync(DB_PATH, "utf-8"));

/** Remove acentos e caixa para a busca casar "feijao" com "Feijão". */
const normalize = normalizeFoodText;

/** Índice pré-computado: evita normalizar 591 strings a cada requisição. */
const SEARCH_INDEX = new Map(
  FOODS.map((food) => [food.id, normalize(`${food.name} ${food.category}`)]),
);

const BY_ID = new Map(FOODS.map((food) => [food.id, food]));

/**
 * Busca por nome.
 *
 * Ordena por relevância: quem começa com o termo vem antes de quem apenas o
 * contém — buscar "arroz" deve trazer "Arroz, integral, cozido" antes de
 * "Bolo de arroz".
 */
export function searchTaco(query: string, limit = 20): TacoFood[] {
  const terms = foodSearchTerms(query);
  if (!terms.length) return [];

  const matches: Array<{ food: TacoFood; score: number }> = [];

  for (const food of FOODS) {
    const haystack = SEARCH_INDEX.get(food.id)!;
    const words = haystack.split(" ");
    if (!terms.every(term => words.some(word => word.startsWith(term)))) continue;
    const index = haystack.indexOf(terms[0]);

    matches.push({ food, score: index === 0 ? 0 : 1 });
  }

  matches.sort(
    (a, b) => a.score - b.score || a.food.name.localeCompare(b.food.name, "pt-BR"),
  );

  return matches.slice(0, limit).map((match) => match.food);
}

export function getTacoFoodById(id: string): TacoFood | undefined {
  return BY_ID.get(id);
}

export function getTacoCategories(): string[] {
  return [...new Set(FOODS.map((food) => food.category))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

/** Converte um registro da TACO para o formato de alimento do app. */
export function tacoToFood(food: TacoFood): InsertFood {
  return {
    name: food.name,
    caloriesPerServing: food.calories,
    servingSize: "100 g",
    carbs: food.carbs,
    protein: food.protein,
    fat: food.fat,
    imageUrl: null,
    // Dado oficial medido em laboratório: a confiança é máxima.
    confidence: 1,
    barcode: null,
    source: "taco",
  };
}

export const TACO_FOOD_COUNT = FOODS.length;
