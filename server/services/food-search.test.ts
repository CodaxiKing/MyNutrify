import test from "node:test";
import assert from "node:assert/strict";
import { searchTaco, tacoToFood } from "./taco";
import { foodSearchTerms } from "../../shared/food-search";
import { OpenFoodFactsService } from "./openfoodfacts";

test("busca encontra preparos sem exigir vírgulas ou ordem das palavras", () => {
  for (const query of ["arroz cozido", "peito de frango", "feijao carioca", "pao frances", "frango peito grelhado"]) {
    assert.ok(searchTaco(query).length > 0, query);
  }
  assert.ok(searchTaco("arroz cozido").every(food => food.name.includes("cozido")));
});
test("acentos e nomes regionais levam ao mesmo alimento", () => {
  assert.deepEqual(searchTaco("feijão"), searchTaco("FEIJAO"));
  assert.deepEqual(searchTaco("aipim cozido"), searchTaco("mandioca cozido"));
  assert.deepEqual(searchTaco("macaxeira"), searchTaco("mandioca"));
  assert.deepEqual(searchTaco("pão de sal"), searchTaco("pão francês"));
  assert.ok(searchTaco("arroz branco cozido").length);
  assert.ok(foodSearchTerms("frango sem pele").includes("sem"));
});
test("localização preserva os nutrientes e a porção", () => {
  const food = searchTaco("arroz cozido")[0];
  const converted = tacoToFood(food);
  assert.equal(converted.caloriesPerServing, food.calories);
  assert.equal(converted.servingSize, "100 g");
  assert.deepEqual(searchTaco("  "), []);
});
test("produtos usam nome português e busca limitada ao Brasil", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("lc"), "pt");
    assert.equal(url.searchParams.get("tag_0"), "en:brazil");
    return new Response(JSON.stringify({ products: [
      { product_name: "Oat flakes", product_name_pt: "Aveia em flocos", lang: "en", serving_size: "30 g", nutriments: { "energy-kcal_100g": 400 } },
      { product_name: "Chocolate milk", lang: "en", nutriments: { "energy-kcal_100g": 60 } },
      { product_name: "Leite integral", lang: "pt", nutriments: { "energy-kcal_100g": 60 } },
    ] }));
  };
  try {
    const results = await new OpenFoodFactsService().searchByName("aveia");
    assert.deepEqual(results.map(food => food.name), ["Aveia em flocos", "Leite integral"]);
    assert.equal(results[0].caloriesPerServing, 120);
    assert.equal(results[0].servingSize, "30 g");
  } finally { globalThis.fetch = original; }
});
