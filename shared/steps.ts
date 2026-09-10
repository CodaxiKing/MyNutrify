/**
 * Cálculo de passos, distância e calorias.
 *
 * Compartilhado entre client e server para que os dois cheguem exatamente ao
 * mesmo número — o app mostra em tempo real, o servidor grava no resumo do dia.
 */

/** Meta diária padrão, quando o usuário não definiu a sua. */
export const DEFAULT_STEP_GOAL = 8000;

/**
 * Comprimento da passada em metros, estimado pela altura.
 *
 * Fatores clássicos de antropometria para caminhada: 0,415 para homens e
 * 0,413 para mulheres sobre a altura. Sem altura no perfil, cai em 0,71 m —
 * a passada média de um adulto.
 */
export function strideLengthMeters(
  heightCm: number | null | undefined,
  gender: string | null | undefined,
): number {
  if (!heightCm || heightCm <= 0) return 0.71;

  const factor = gender === "female" ? 0.413 : 0.415;
  return (heightCm * factor) / 100;
}

/** Distância percorrida, em metros. */
export function stepsToMeters(
  steps: number,
  heightCm: number | null | undefined,
  gender: string | null | undefined,
): number {
  if (steps <= 0) return 0;
  return steps * strideLengthMeters(heightCm, gender);
}

/**
 * Calorias gastas caminhando.
 *
 * Usa o custo energético bruto da caminhada — cerca de 0,75 kcal por
 * quilômetro por quilo de massa corporal, valor consolidado na literatura de
 * fisiologia do exercício. Depender só de passos e peso evita exigir do
 * sensor um dado de velocidade que ele não fornece de forma confiável.
 */
export function stepsToCalories(
  steps: number,
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
  gender: string | null | undefined,
): number {
  if (steps <= 0) return 0;

  const weight = weightKg && weightKg > 0 ? weightKg : 70;
  const km = stepsToMeters(steps, heightCm, gender) / 1000;

  return Math.round(km * weight * 0.75);
}

/** Formata a distância como "1,24 km" ou "840 m". */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} km`;
}

/** Data no formato YYYY-MM-DD, no fuso local — o dia do usuário, não o UTC. */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
