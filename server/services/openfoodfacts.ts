import type { InsertFood } from "@shared/schema";

interface OpenFoodFactsProduct {
  product_name?: string;
  product_name_pt?: string;
  lang?: string;
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
  private host = "https://world.openfoodfacts.org";

  /** Consulta de produto por código de barras. */
  private productUrl(barcode: string) {
    return `${this.host}/api/v0/product/${barcode}.json?lc=pt&cc=br`;
  }

  /**
   * Busca textual.
   *
   * O `cgi/search.pl` fica na raiz do site, NÃO sob `/api/v0`. O código
   * montava `/api/v0/cgi/search.pl`, que o servidor tratava como consulta de
   * produto e respondia `{"status":0,"status_verbose":"no code or invalid
   * code"}` — a busca por nome nunca devolveu nada.
   */
  private searchUrl(query: string, limit: number) {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: String(limit),
      lc: "pt",
      cc: "br",
      tagtype_0: "countries",
      tag_contains_0: "contains",
      tag_0: "en:brazil",
    });
    return `${this.host}/cgi/search.pl?${params}`;
  }

  /** O OpenFoodFacts exige identificação do cliente nas chamadas de API. */
  private headers = {
    "User-Agent": "MyNutrify/1.0 (https://github.com/DiegoTavares/MyNutrify)",
  };

  async searchByBarcode(barcode: string): Promise<InsertFood | null> {
    try {
      const response = await fetch(this.productUrl(barcode), {
        headers: this.headers,
        signal: AbortSignal.timeout(8000),
      });
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
      const response = await fetch(this.searchUrl(query, limit), {
        headers: this.headers,
        signal: AbortSignal.timeout(8000),
      });
      const data: SearchResult = await response.json();

      if (data.products && data.products.length > 0) {
        return data.products
          .filter(product => product.product_name_pt?.trim() || product.lang === "pt")
          .map(product => this.convertToFood(product))
          .filter(food => food !== null) as InsertFood[];
      }

      return [];
    } catch (error) {
      console.error("Error searching OpenFoodFacts:", error);
      return [];
    }
  }

  /**
   * Extrai o peso em gramas de uma porcao declarada pelo OpenFoodFacts.
   *
   * O campo `serving_size` e texto livre preenchido por colaboradores:
   * "30 g", "1 fatia (25g)", "250ml". Devolve null quando nao da para
   * determinar o peso com seguranca.
   */
  private parseServingGrams(servingSize?: string): number | null {
    if (!servingSize) return null;

    // Pega o ultimo numero seguido de g/ml — cobre "1 fatia (25 g)".
    const matches = [...servingSize.matchAll(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/gi)];
    if (matches.length === 0) return null;

    const grams = Number(matches[matches.length - 1][1].replace(",", "."));

    // Valores absurdos costumam ser erro de preenchimento.
    if (!Number.isFinite(grams) || grams <= 0 || grams > 2000) return null;

    return grams;
  }

  private convertToFood(product: OpenFoodFactsProduct, barcode?: string): InsertFood | null {
    const name = product.product_name_pt?.trim() || product.product_name?.trim();
    if (!name || !product.nutriments) {
      return null;
    }

    const nutriments = product.nutriments;

    // O OpenFoodFacts entrega os nutrientes por 100 g. Antes o codigo usava
    // esses valores direto mas rotulava com a porcao do produto: um item com
    // porcao de 30 g aparecia com a caloria de 100 g — mais que o triplo.
    const servingGrams = this.parseServingGrams(product.serving_size);
    const factor = servingGrams ? servingGrams / 100 : 1;

    const scale = (value?: number) =>
      typeof value === "number" ? Math.round(value * factor * 100) / 100 : 0;

    return {
      name,
      caloriesPerServing: scale(nutriments['energy-kcal_100g']),
      servingSize: servingGrams ? `${servingGrams} g` : "100 g",
      carbs: scale(nutriments['carbohydrates_100g']),
      protein: scale(nutriments['proteins_100g']),
      fat: scale(nutriments['fat_100g']),
      imageUrl: product.image_url || null,
      confidence: 0.9,
      barcode: barcode || product.code || null,
      source: "openfoodfacts",
    };
  }
}

export const openFoodFactsService = new OpenFoodFactsService();
