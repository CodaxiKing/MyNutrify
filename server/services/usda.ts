/**
 * USDA FoodData Central.
 *
 * Base pública e gratuita com ~250 mil alimentos (CC0). Complementa a TACO em
 * alimento genérico e marca importada.
 *
 * Precisa de uma chave gratuita em https://fdc.nal.usda.gov/api-key-signup —
 * defina `USDA_API_KEY`. Sem chave o serviço fica desligado e a busca segue
 * funcionando com as outras fontes.
 *
 * Limite: 1.000 requisições/hora por IP com chave própria.
 */

import type { InsertFood } from "@shared/schema";

const API_KEY = process.env.USDA_API_KEY?.trim();
const BASE_URL = "https://api.nal.usda.gov/fdc/v1";

/** Só consulta a USDA se houver chave configurada. */
export const usdaEnabled = Boolean(API_KEY);

/** Ids dos nutrientes na USDA (mesmos números do padrão INFOODS). */
const NUTRIENT = {
  calories: 1008,
  protein: 1003,
  fat: 1004,
  carbs: 1005,
} as const;

interface UsdaNutrient {
  nutrientId?: number;
  value?: number;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  gtinUpc?: string;
  foodNutrients?: UsdaNutrient[];
}

interface UsdaSearchResponse {
  foods?: UsdaFood[];
}

function nutrientValue(food: UsdaFood, id: number): number | null {
  const nutrient = food.foodNutrients?.find((n) => n.nutrientId === id);
  return typeof nutrient?.value === "number" ? nutrient.value : null;
}

/**
 * Converte um alimento da USDA para o formato do app.
 *
 * A USDA reporta nutrientes por 100 g. Quando o produto declara uma porção
 * diferente, os valores são convertidos para essa porção — caso contrário o
 * app mostraria a caloria de 100 g rotulada como "30 g".
 */
function toFood(food: UsdaFood): InsertFood | null {
  const caloriesPer100g = nutrientValue(food, NUTRIENT.calories);
  if (caloriesPer100g === null) return null;

  // Só converte quando a porção está em grama/mililitro; unidades como "1 cup"
  // não dão para escalar sem o peso correspondente.
  const unit = food.servingSizeUnit?.toLowerCase();
  const scalable = unit === "g" || unit === "ml";
  const grams = scalable && food.servingSize ? food.servingSize : 100;
  const factor = grams / 100;

  const scale = (value: number | null) =>
    value === null ? null : Math.round(value * factor * 100) / 100;

  const brand = food.brandName ?? food.brandOwner;

  return {
    name: brand ? `${food.description} (${brand})` : food.description,
    caloriesPerServing: Math.round(caloriesPer100g * factor * 100) / 100,
    servingSize: grams === 100 ? "100 g" : `${grams} ${unit}`,
    carbs: scale(nutrientValue(food, NUTRIENT.carbs)),
    protein: scale(nutrientValue(food, NUTRIENT.protein)),
    fat: scale(nutrientValue(food, NUTRIENT.fat)),
    imageUrl: null,
    confidence: 0.95,
    barcode: food.gtinUpc ?? null,
    source: "usda",
  };
}

/**
 * Busca alimentos na USDA.
 *
 * Devolve lista vazia em qualquer falha (sem chave, limite atingido, rede
 * fora): a busca do app não pode quebrar porque uma fonte externa caiu.
 */
export async function searchUsda(query: string, limit = 10): Promise<InsertFood[]> {
  if (!API_KEY) return [];

  try {
    const params = new URLSearchParams({
      api_key: API_KEY,
      query,
      pageSize: String(Math.min(limit, 50)),
      // Alimentos de referência e genéricos antes de produtos de marca.
      dataType: "Foundation,SR Legacy,Branded",
    });

    const response = await fetch(`${BASE_URL}/foods/search?${params}`, {
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      console.error("USDA respondeu", response.status);
      return [];
    }

    const data = (await response.json()) as UsdaSearchResponse;

    return (data.foods ?? [])
      .map(toFood)
      .filter((food): food is InsertFood => food !== null)
      .slice(0, limit);
  } catch (error) {
    console.error("Erro ao consultar a USDA:", error);
    return [];
  }
}
