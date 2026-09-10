/**
 * Biblioteca de exercícios do MyNutrify
 *
 * Os dados textuais (nomes, grupos musculares, equipamentos e instruções) vêm do
 * dataset MIT hasaneyldrm/exercises-dataset e são regenerados por
 * `node scripts/build-exercise-db.mjs`.
 *
 * As mídias (imagens/GIFs) são © Gym visual (https://gymvisual.com/) e NÃO
 * acompanham este repositório. Ver EXERCISES-NOTICE.md.
 */

export type BodyPart =
  | "back"
  | "cardio"
  | "chest"
  | "lower arms"
  | "lower legs"
  | "neck"
  | "shoulders"
  | "upper arms"
  | "upper legs"
  | "waist";

export interface LibraryExercise {
  id: string;
  name: string;
  bodyPart: BodyPart;
  equipment: string;
  target: string;
  muscleGroup: string;
  secondaryMuscles: string[];
  steps: string[];
  mediaId: string;
}

/** Regiões do corpo, em pt-BR. */
export const BODY_PART_PT: Record<BodyPart, string> = {
  back: "Costas",
  cardio: "Cardio",
  chest: "Peito",
  "lower arms": "Antebraços",
  "lower legs": "Panturrilhas",
  neck: "Pescoço",
  shoulders: "Ombros",
  "upper arms": "Braços",
  "upper legs": "Pernas",
  waist: "Core / Abdômen",
};

/** Equipamentos, em pt-BR. */
export const EQUIPMENT_PT: Record<string, string> = {
  assisted: "Assistido",
  band: "Elástico",
  barbell: "Barra",
  "body weight": "Peso corporal",
  "bosu ball": "Bosu",
  cable: "Cabo / Polia",
  dumbbell: "Halter",
  "elliptical machine": "Elíptico",
  "ez barbell": "Barra W",
  hammer: "Martelo",
  kettlebell: "Kettlebell",
  "leverage machine": "Máquina articulada",
  "medicine ball": "Medicine ball",
  "olympic barbell": "Barra olímpica",
  "resistance band": "Faixa elástica",
  roller: "Rolo",
  rope: "Corda",
  "skierg machine": "SkiErg",
  "sled machine": "Leg press / Trenó",
  "smith machine": "Smith",
  "stability ball": "Bola suíça",
  "stationary bike": "Bicicleta ergométrica",
  "stepmill machine": "Escada ergométrica",
  tire: "Pneu",
  "trap bar": "Barra hexagonal",
  "upper body ergometer": "Ergômetro de braços",
  weighted: "Com carga",
  "wheel roller": "Roda abdominal",
};

/** Músculos-alvo e sinergistas, em pt-BR. */
export const MUSCLE_PT: Record<string, string> = {
  abdominals: "Abdômen",
  abductors: "Abdutores",
  abs: "Abdômen",
  adductors: "Adutores",
  "ankle stabilizers": "Estabilizadores do tornozelo",
  ankles: "Tornozelos",
  back: "Costas",
  biceps: "Bíceps",
  brachialis: "Braquial",
  calves: "Panturrilhas",
  "cardiovascular system": "Sistema cardiovascular",
  chest: "Peito",
  core: "Core",
  deltoids: "Deltoides",
  delts: "Deltoides",
  feet: "Pés",
  forearms: "Antebraços",
  glutes: "Glúteos",
  "grip muscles": "Músculos da pegada",
  groin: "Virilha",
  hamstrings: "Posteriores de coxa",
  hands: "Mãos",
  "hip flexors": "Flexores do quadril",
  "inner thighs": "Face interna da coxa",
  lats: "Dorsais",
  "latissimus dorsi": "Grande dorsal",
  "levator scapulae": "Levantador da escápula",
  "lower abs": "Abdômen inferior",
  "lower back": "Lombar",
  obliques: "Oblíquos",
  pectorals: "Peitorais",
  quadriceps: "Quadríceps",
  quads: "Quadríceps",
  "rear deltoids": "Deltoide posterior",
  rhomboids: "Romboides",
  "rotator cuff": "Manguito rotador",
  "serratus anterior": "Serrátil anterior",
  shins: "Canelas",
  shoulders: "Ombros",
  soleus: "Sóleo",
  spine: "Coluna / Eretores",
  sternocleidomastoid: "Esternocleidomastóideo",
  traps: "Trapézio",
  trapezius: "Trapézio",
  triceps: "Tríceps",
  "upper back": "Costas (superior)",
  "upper chest": "Peito (superior)",
  "wrist extensors": "Extensores do punho",
  "wrist flexors": "Flexores do punho",
  wrists: "Punhos",
};

export function translateBodyPart(value: string): string {
  return BODY_PART_PT[value as BodyPart] ?? value;
}

export function translateEquipment(value: string): string {
  return EQUIPMENT_PT[value] ?? value;
}

export function translateMuscle(value: string): string {
  return MUSCLE_PT[value] ?? value;
}

/**
 * MET estimado por região do corpo, usado para converter um treino de força
 * registrado em calorias queimadas. Valores derivados do Compendium of
 * Physical Activities (Ainsworth et al.).
 */
export const BODY_PART_MET: Record<BodyPart, number> = {
  back: 5.0,
  cardio: 7.0,
  chest: 5.0,
  "lower arms": 3.5,
  "lower legs": 4.0,
  neck: 2.5,
  shoulders: 4.5,
  "upper arms": 4.0,
  "upper legs": 6.0,
  waist: 4.0,
};

/**
 * Atribuição obrigatória caso as mídias do dataset sejam usadas.
 * Ver EXERCISES-NOTICE.md antes de habilitar `VITE_EXERCISE_MEDIA_BASE_URL`.
 */
export const EXERCISE_MEDIA_ATTRIBUTION = "© Gym visual — https://gymvisual.com/";
