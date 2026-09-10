/**
 * Gera shared/exercise-db.json a partir do dataset MIT
 * hasaneyldrm/exercises-dataset (1.324 exercícios).
 *
 * Somente os campos textuais (MIT) são embarcados. As mídias (imagens/GIFs)
 * são © Gym visual e NÃO são redistribuídas aqui — guardamos apenas o
 * `mediaId` para que quem tiver licença possa montar a URL por conta própria.
 *
 * Uso: node scripts/build-exercise-db.mjs
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE =
  "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../shared/exercise-db.json");

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Falha ao baixar dataset: ${res.status}`);
const raw = await res.json();

const compact = raw.map((e) => ({
  id: e.id,
  name: e.name,
  bodyPart: e.body_part,
  equipment: e.equipment,
  target: e.target,
  muscleGroup: e.muscle_group,
  secondaryMuscles: e.secondary_muscles,
  steps: e.instruction_steps.en,
  mediaId: e.media_id,
}));

compact.sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(OUT, JSON.stringify(compact), "utf-8");
console.log(`${compact.length} exercícios gravados em shared/exercise-db.json`);
