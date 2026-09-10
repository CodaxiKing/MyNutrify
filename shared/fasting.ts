/**
 * Protocolos e fases do jejum intermitente.
 *
 * Compartilhado entre client e server para que o cálculo de progresso e de
 * fase metabólica seja idêntico nos dois lados.
 */

export type FastingProtocolId = "16:8" | "18:6" | "20:4" | "omad" | "24h" | "36h" | "custom";

export interface FastingProtocol {
  id: FastingProtocolId;
  name: string;
  /** Duração do jejum em minutos. */
  fastMinutes: number;
  /** Duração da janela de alimentação em minutos (0 para jejuns longos). */
  eatMinutes: number;
  description: string;
  level: "iniciante" | "intermediário" | "avançado";
}

export const FASTING_PROTOCOLS: FastingProtocol[] = [
  {
    id: "16:8",
    name: "16:8 — Leangains",
    fastMinutes: 16 * 60,
    eatMinutes: 8 * 60,
    description: "16h de jejum e 8h de janela alimentar. O protocolo mais popular e o melhor ponto de partida.",
    level: "iniciante",
  },
  {
    id: "18:6",
    name: "18:6",
    fastMinutes: 18 * 60,
    eatMinutes: 6 * 60,
    description: "18h de jejum e 6h de janela. Um degrau acima do 16:8, com mais tempo em cetose.",
    level: "intermediário",
  },
  {
    id: "20:4",
    name: "20:4 — Guerreiro",
    fastMinutes: 20 * 60,
    eatMinutes: 4 * 60,
    description: "20h de jejum com uma janela curta de 4h. Exige boa adaptação metabólica.",
    level: "avançado",
  },
  {
    id: "omad",
    name: "OMAD — Uma refeição por dia",
    fastMinutes: 23 * 60,
    eatMinutes: 60,
    description: "23h de jejum e uma única refeição. Requer atenção redobrada à densidade nutricional.",
    level: "avançado",
  },
  {
    id: "24h",
    name: "24 horas",
    fastMinutes: 24 * 60,
    eatMinutes: 0,
    description: "Jejum de um dia inteiro, normalmente feito 1 a 2 vezes por semana.",
    level: "avançado",
  },
  {
    id: "36h",
    name: "36 horas — Monk Fast",
    fastMinutes: 36 * 60,
    eatMinutes: 0,
    description: "Jejum prolongado de 36h. Faça apenas com acompanhamento profissional.",
    level: "avançado",
  },
  {
    id: "custom",
    name: "Personalizado",
    fastMinutes: 14 * 60,
    eatMinutes: 10 * 60,
    description: "Defina livremente a duração do seu jejum.",
    level: "iniciante",
  },
];

export function getProtocol(id: FastingProtocolId): FastingProtocol {
  return FASTING_PROTOCOLS.find((p) => p.id === id) ?? FASTING_PROTOCOLS[0];
}

export interface FastingPhase {
  /** Hora de jejum em que a fase começa. */
  startHour: number;
  name: string;
  description: string;
  /** Chave de cor do tema (chart-1..5). */
  color: string;
}

/**
 * Fases metabólicas aproximadas do jejum. São referências educativas — o tempo
 * exato varia por pessoa, última refeição e nível de atividade.
 */
export const FASTING_PHASES: FastingPhase[] = [
  {
    startHour: 0,
    name: "Digestão",
    description: "O corpo ainda está absorvendo a última refeição. A insulina está alta e a glicose é o combustível principal.",
    color: "chart-3",
  },
  {
    startHour: 4,
    name: "Queda da insulina",
    description: "A insulina começa a cair e o organismo passa a usar o glicogênio do fígado como fonte de energia.",
    color: "chart-1",
  },
  {
    startHour: 12,
    name: "Início da cetose",
    description: "O glicogênio se esgota e o corpo começa a converter gordura em corpos cetônicos.",
    color: "chart-4",
  },
  {
    startHour: 16,
    name: "Queima de gordura",
    description: "Cetose estabelecida: a gordura vira a principal fonte de energia e o hormônio do crescimento sobe.",
    color: "chart-2",
  },
  {
    startHour: 24,
    name: "Autofagia",
    description: "A reciclagem celular se intensifica — o corpo passa a degradar componentes danificados.",
    color: "chart-5",
  },
  {
    startHour: 48,
    name: "Autofagia profunda",
    description: "Jejum prolongado. Só deve ser feito com acompanhamento médico.",
    color: "destructive",
  },
];

export function getCurrentPhase(elapsedMinutes: number): FastingPhase {
  const hours = elapsedMinutes / 60;
  let current = FASTING_PHASES[0];
  for (const phase of FASTING_PHASES) {
    if (hours >= phase.startHour) current = phase;
  }
  return current;
}

export function getNextPhase(elapsedMinutes: number): FastingPhase | null {
  const hours = elapsedMinutes / 60;
  return FASTING_PHASES.find((p) => p.startHour > hours) ?? null;
}

/** Formata uma duração em minutos como "16h 32min" (ou "45min"). */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

/** Formata segundos como "15:42:07" — usado no cronômetro regressivo. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}
