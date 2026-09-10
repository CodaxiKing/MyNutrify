/**
 * Gera shared/taco-db.json a partir da Tabela Brasileira de Composição de
 * Alimentos (TACO, 4ª edição), via marcelosanto/tabela_taco (MIT).
 *
 * São 597 alimentos brasileiros preparados — o que o OpenFoodFacts não cobre,
 * porque comida de verdade não tem código de barras.
 *
 * Uso: node scripts/build-taco-db.mjs
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE =
  "https://raw.githubusercontent.com/marcelosanto/tabela_taco/main/TACO.json";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../shared/taco-db.json");

/**
 * A TACO usa marcadores textuais no lugar de números:
 * "NA" = não analisado, "Tr" = traço (quantidade desprezível), "" = sem dado.
 * Todos viram 0 ou null conforme o caso.
 */
function num(value) {
  if (typeof value === "number") return Math.round(value * 100) / 100;
  if (value === "Tr") return 0; // traço: presente, mas desprezível
  return null; // "NA" e vazio: sem dado
}

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Falha ao baixar TACO: ${res.status}`);
const raw = await res.json();

const compact = raw
  .map((food) => ({
    id: String(food.id),
    name: food.description,
    category: food.category,
    // Toda a TACO é expressa por 100 g de parte comestível.
    calories: num(food.energy_kcal),
    protein: num(food.protein_g),
    carbs: num(food.carbohydrate_g),
    fat: num(food.lipid_g),
    fiber: num(food.fiber_g),
    sodium: num(food.sodium_mg),
  }))
  // Sem caloria o registro não serve para o diário.
  .filter((food) => food.calories !== null && food.name);

compact.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

writeFileSync(OUT, JSON.stringify(compact), "utf-8");
console.log(`${compact.length} alimentos gravados em shared/taco-db.json`);
