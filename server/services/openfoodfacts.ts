import type { InsertFood } from "@shared/schema";

interface OpenFoodFactsProduct {
  product_name?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'carbohydrates_100g'?: number;
    'proteins_100g'?: number;
    'fat_100g'?: number;
  };
  serving_size?: string;
  image_url?: string;
  code?: string;
}

interface OpenFoodFactsResponse {
  status: number;
  product?: OpenFoodFactsProduct;
}

interface SearchResult {
  products?: OpenFoodFactsProduct[];
  count?: number;
}

export class OpenFoodFactsService {
  private baseUrl = "https://world.openfoodfacts.org/api/v0";

  async searchByBarcode(barcode: string): Promise<InsertFood | null> {
    try {
      const response = await fetch(`${this.baseUrl}/product/${barcode}.json`);
      const data: OpenFoodFactsResponse = await response.json();

      if (data.status === 1 && data.product) {
        return this.convertToFood(data.product, barcode);
      }

      return null;
    } catch (error) {
      console.error("Error fetching from OpenFoodFacts:", error);
      return null;
    }
  }

  async searchByName(query: string, limit: number = 20): Promise<InsertFood[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `${this.baseUrl}/cgi/search.pl?search_terms=${encodedQuery}&search_simple=1&action=process&json=1&page_size=${limit}`
      );
      const data: SearchResult = await response.json();

      if (data.products && data.products.length > 0) {
        return data.products
          .filter(product => product.product_name && product.nutriments)
          .map(product => this.convertToFood(product))
          .filter(food => food !== null) as InsertFood[];
      }

      return [];
    } catch (error) {
      console.error("Error searching OpenFoodFacts:", error);
      return [];
    }
  }

  private convertToFood(product: OpenFoodFactsProduct, barcode?: string): InsertFood | null {
    if (!product.product_name || !product.nutriments) {
      return null;
    }

    const calories = product.nutriments['energy-kcal_100g'] || 0;
    const carbs = product.nutriments['carbohydrates_100g'] || 0;
    const protein = product.nutriments['proteins_100g'] || 0;
    const fat = product.nutriments['fat_100g'] || 0;

    return {
      name: product.product_name,
      caloriesPerServing: calories,
      servingSize: product.serving_size || "100g",
      carbs,
      protein,
      fat,
      imageUrl: product.image_url || null,
      confidence: 0.9, // High confidence for OpenFoodFacts data
      barcode: barcode || product.code || null,
      source: "openfoodfacts",
    };
  }
}

export const openFoodFactsService = new OpenFoodFactsService();