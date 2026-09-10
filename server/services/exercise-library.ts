/**
 * Biblioteca de exercícios em memória.
 *
 * O dataset (1.324 exercícios, MIT) é grande demais para ir no bundle do
 * client, então fica no servidor e é consultado por API. Ver EXERCISES-NOTICE.md
 * para a atribuição.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LibraryExercise } from "@shared/exercises-library";
import { BODY_PART_MET, type BodyPart } from "@shared/exercises-library";

// Resolvido a partir da raiz do projeto: funciona tanto com `tsx server/index.ts`
// quanto com o bundle em dist/, já que os dois rodam com o cwd na raiz.
const DB_PATH = resolve(process.cwd(), "shared/exercise-db.json");

const EXERCISES: LibraryExercise[] = JSON.parse(readFileSync(DB_PATH, "utf-8"));

export interface ExerciseQuery {
  search?: string;
  bodyPart?: string;
  equipment?: string;
  target?: string;
  limit?: number;
  offset?: number;
}

export interface ExerciseQueryResult {
  items: LibraryExercise[];
  total: number;
  limit: number;
  offset: number;
}

/** Índice por id, para lookups O(1) ao montar um plano. */
const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Termos de busca pré-computados, para não normalizar 1.324 strings por request. */
const SEARCH_INDEX = new Map(
  EXERCISES.map((e) => [
    e.id,
    normalize([e.name, e.target, e.equipment, e.bodyPart, e.muscleGroup].join(" ")),
  ]),
);

export function queryExercises(query: ExerciseQuery = {}): ExerciseQueryResult {
  const limit = Math.min(Math.max(query.limit ?? 30, 1), 200);
  const offset = Math.max(query.offset ?? 0, 0);
  const search = query.search ? normalize(query.search.trim()) : "";

  const filtered = EXERCISES.filter((exercise) => {
    if (query.bodyPart && exercise.bodyPart !== query.bodyPart) return false;
    if (query.equipment && exercise.equipment !== query.equipment) return false;
    if (query.target && exercise.target !== query.target) return false;
    if (search && !SEARCH_INDEX.get(exercise.id)!.includes(search)) return false;
    return true;
  });

  return {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
    limit,
    offset,
  };
}

export function getExerciseById(id: string): LibraryExercise | undefined {
  return BY_ID.get(id);
}

/** Valores distintos disponíveis para montar os filtros da interface. */
export function getExerciseFacets() {
  const bodyParts = new Set<string>();
  const equipment = new Set<string>();
  const targets = new Set<string>();

  for (const exercise of EXERCISES) {
    bodyParts.add(exercise.bodyPart);
    equipment.add(exercise.equipment);
    targets.add(exercise.target);
  }

  return {
    bodyParts: [...bodyParts].sort(),
    equipment: [...equipment].sort(),
    targets: [...targets].sort(),
    total: EXERCISES.length,
  };
}

/**
 * Estima as calorias queimadas numa sessão de treino de força.
 *
 * Usa o MET médio das regiões trabalhadas: kcal = MET x peso(kg) x horas.
 */
export function estimateWorkoutCalories(
  bodyParts: string[],
  durationSeconds: number,
  userWeightKg: number,
): number {
  if (durationSeconds <= 0 || userWeightKg <= 0) return 0;

  const mets = bodyParts
    .map((part) => BODY_PART_MET[part as BodyPart])
    .filter((met): met is number => typeof met === "number");

  // Sem regiões reconhecidas, cai no MET genérico de musculação moderada.
  const averageMet = mets.length > 0 ? mets.reduce((a, b) => a + b, 0) / mets.length : 5.0;

  return Math.round(averageMet * userWeightKg * (durationSeconds / 3600));
}
