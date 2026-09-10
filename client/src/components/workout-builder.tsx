/**
 * Montador de série de treino.
 *
 * Junta exercícios da biblioteca num plano, com séries, repetições, carga e
 * descanso por exercício. A ordem é editável por arrastar (framer-motion Reorder).
 */

import { useState } from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import {
  ChevronDown,
  Dumbbell,
  GripVertical,
  Layers,
  ListPlus,
  PencilLine,
  Save,
  Timer,
  Trash2,
  Weight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ExerciseLibraryBrowser } from "@/components/exercise-library-browser";
import { ExerciseMedia } from "@/components/exercise-media";
import { useSaveWorkoutPlan } from "@/hooks/use-workouts";
import type { WorkoutPlanWithExercises } from "@shared/schema";
import {
  BODY_PART_PT,
  translateBodyPart,
  translateEquipment,
  translateMuscle,
  type BodyPart,
  type LibraryExercise,
} from "@shared/exercises-library";

/** Exercício dentro do plano em edição. */
export interface DraftExercise {
  /** Chave local — permite o mesmo exercício aparecer duas vezes no treino. */
  key: string;
  /** Nulo quando o exercício foi criado pelo usuário, fora da biblioteca. */
  libraryExerciseId: string | null;
  /** Referência da mídia de demonstração; nulo em exercício personalizado. */
  mediaId: string | null;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  sets: number;
  reps: number;
  weight: number | null;
  restSeconds: number;
  notes: string | null;
}

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export interface WorkoutBuilderProps {
  /** Plano existente para editar; ausente cria um novo. */
  plan?: WorkoutPlanWithExercises;
  onDone: () => void;
  onCancel: () => void;
}

export function WorkoutBuilder({ plan, onDone, onCancel }: WorkoutBuilderProps) {
  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [weekdays, setWeekdays] = useState<number[]>(plan?.weekdays ?? []);
  const [exercises, setExercises] = useState<DraftExercise[]>(
    () =>
      plan?.exercises.map((exercise) => ({
        key: exercise.id,
        libraryExerciseId: exercise.libraryExerciseId,
        mediaId: exercise.mediaId,
        name: exercise.name,
        bodyPart: exercise.bodyPart,
        equipment: exercise.equipment,
        target: exercise.target,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
        restSeconds: exercise.restSeconds,
        notes: exercise.notes,
      })) ?? [],
  );

  const [showLibrary, setShowLibrary] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [detail, setDetail] = useState<LibraryExercise | null>(null);

  const savePlan = useSaveWorkoutPlan();

  const addExercise = (exercise: LibraryExercise) => {
    setExercises((current) => [
      ...current,
      {
        key: `${exercise.id}-${Date.now()}`,
        libraryExerciseId: exercise.id,
        mediaId: exercise.mediaId,
        name: exercise.name,
        bodyPart: exercise.bodyPart,
        equipment: exercise.equipment,
        target: exercise.target,
        sets: 3,
        // Cardio costuma ser medido em tempo, não em repetições; 12 é um
        // ponto de partida razoável para o resto.
        reps: exercise.bodyPart === "cardio" ? 1 : 12,
        weight: null,
        restSeconds: 60,
        notes: null,
      },
    ]);

    toast({ title: "Adicionado", description: exercise.name });
  };

  /**
   * Adiciona um exercício que não existe na biblioteca.
   *
   * Sem `libraryExerciseId` não há demonstração, mas o resto do treino
   * (séries, carga, descanso, histórico) funciona igual.
   */
  const addCustomExercise = (custom: {
    name: string;
    bodyPart: string;
    equipment: string;
  }) => {
    setExercises((current) => [
      ...current,
      {
        key: `custom-${Date.now()}`,
        libraryExerciseId: null,
        mediaId: null,
        name: custom.name.trim(),
        bodyPart: custom.bodyPart,
        equipment: custom.equipment,
        // Sem alvo declarado, a região do corpo já orienta o cálculo de MET.
        target: custom.bodyPart,
        sets: 3,
        reps: 12,
        weight: null,
        restSeconds: 60,
        notes: null,
      },
    ]);

    setShowCustom(false);
    toast({ title: "Exercício criado", description: custom.name });
  };

  const updateExercise = (key: string, patch: Partial<DraftExercise>) => {
    setExercises((current) =>
      current.map((exercise) => (exercise.key === key ? { ...exercise, ...patch } : exercise)),
    );
  };

  const removeExercise = (key: string) => {
    setExercises((current) => current.filter((exercise) => exercise.key !== key));
  };

  const toggleWeekday = (day: number) => {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Dê um nome ao treino",
        description: "Por exemplo: Treino A — Peito e Tríceps.",
        variant: "destructive",
      });
      return;
    }

    if (exercises.length === 0) {
      toast({
        title: "Treino vazio",
        description: "Adicione pelo menos um exercício.",
        variant: "destructive",
      });
      return;
    }

    try {
      await savePlan.mutateAsync({
        id: plan?.id,
        plan: {
          name: name.trim(),
          description: description.trim() || null,
          weekdays,
          color: "primary",
          exercises: exercises.map(({ key: _key, ...exercise }) => exercise),
        },
      });

      toast({
        title: plan ? "Treino atualizado" : "Treino criado",
        description: `${exercises.length} exercício${exercises.length > 1 ? "s" : ""}.`,
      });
      onDone();
    } catch (error) {
      toast({
        title: "Não foi possível salvar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets, 0);

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------- identidade */}
      <div className="surface-card space-y-3.5 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="plan-name">Nome do treino</Label>
          <Input
            id="plan-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Treino A — Peito e Tríceps"
            className="h-11 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="plan-description">Observações (opcional)</Label>
          <Input
            id="plan-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Foco em cadência lenta na fase excêntrica"
            className="h-11 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Dias da semana</Label>
          <div className="flex gap-1.5">
            {WEEKDAYS.map((letter, day) => (
              <motion.button
                key={day}
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => toggleWeekday(day)}
                aria-label={WEEKDAY_NAMES[day]}
                aria-pressed={weekdays.includes(day)}
                className={cn(
                  "flex size-10 flex-1 items-center justify-center rounded-xl border text-sm font-semibold transition-colors",
                  weekdays.includes(day)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {letter}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------- exercícios */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Exercícios</h2>
            {exercises.length > 0 && (
              <Badge variant="secondary" className="rounded-full">
                {exercises.length} · {totalSets} séries
              </Badge>
            )}
          </div>

          <div className="flex gap-1.5">
            <ActionButton
              variant="outline"
              size="sm"
              icon={<PencilLine />}
              onClick={() => setShowCustom(true)}
            >
              Criar
            </ActionButton>

            <ActionButton
              variant="soft"
              size="sm"
              icon={<ListPlus />}
              onClick={() => setShowLibrary(true)}
            >
              Biblioteca
            </ActionButton>
          </div>
        </div>

        {exercises.length === 0 ? (
          <button
            type="button"
            onClick={() => setShowLibrary(true)}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border py-10 text-center transition-colors hover:border-primary/50"
          >
            <Dumbbell className="size-8 text-muted-foreground/40" />
            <span className="text-sm font-medium">Monte sua série</span>
            <span className="text-xs text-muted-foreground">
              Escolha entre 1.324 exercícios — ou crie o seu
            </span>
          </button>
        ) : (
          <Reorder.Group axis="y" values={exercises} onReorder={setExercises} className="space-y-2">
            {exercises.map((exercise, index) => (
              <ExerciseRow
                key={exercise.key}
                exercise={exercise}
                index={index}
                onUpdate={(patch) => updateExercise(exercise.key, patch)}
                onRemove={() => removeExercise(exercise.key)}
              />
            ))}
          </Reorder.Group>
        )}
      </div>

      {/* ------------------------------------------------------------ ações */}
      <div className="flex gap-2.5">
        <ActionButton variant="outline" size="lg" full onClick={onCancel}>
          Cancelar
        </ActionButton>
        <ActionButton
          variant="strength"
          size="lg"
          full
          icon={<Save />}
          loading={savePlan.isPending}
          onClick={handleSave}
        >
          Salvar
        </ActionButton>
      </div>

      {/* ------------------------------------------------ seletor da library */}
      <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
        <DialogContent className="flex h-[85vh] max-w-md flex-col gap-0 rounded-3xl p-5">
          <DialogHeader className="pb-2">
            <DialogTitle>Biblioteca de exercícios</DialogTitle>
          </DialogHeader>

          <ExerciseLibraryBrowser
            selectedIds={exercises
              // Exercícios criados pelo usuário não têm id de biblioteca.
              .map((exercise) => exercise.libraryExerciseId)
              .filter((id): id is string => id !== null)}
            onSelect={addExercise}
            onInspect={setDetail}
          />

          <ActionButton
            variant="strength"
            size="lg"
            full
            className="mt-3"
            onClick={() => setShowLibrary(false)}
          >
            Concluir ({exercises.length})
          </ActionButton>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------- criar exercício próprio */}
      <CustomExerciseDialog
        open={showCustom}
        onClose={() => setShowCustom(false)}
        onCreate={addCustomExercise}
      />

      {/* --------------------------------------------- detalhe do exercício */}
      <ExerciseDetailDialog exercise={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function ExerciseRow({
  exercise,
  index,
  onUpdate,
  onRemove,
}: {
  exercise: DraftExercise;
  index: number;
  onUpdate: (patch: Partial<DraftExercise>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Sem controles de arrasto dedicados o card inteiro viraria alça, e os
  // campos numéricos ficariam impossíveis de tocar.
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={exercise}
      dragListener={false}
      dragControls={dragControls}
      className="surface-card overflow-hidden"
    >
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          aria-label="Reordenar"
          onPointerDown={(event) => dragControls.start(event)}
          className="cursor-grab touch-none p-1 text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>

        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
          {index + 1}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-semibold capitalize">{exercise.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {exercise.sets} × {exercise.reps}
            {exercise.weight ? ` · ${exercise.weight}kg` : ""} ·{" "}
            {exercise.restSeconds}s descanso
          </p>
        </button>

        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />

        <ActionButton
          variant="ghost"
          size="icon"
          aria-label="Remover exercício"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </ActionButton>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 gap-2 border-t border-border/60 bg-muted/30 p-3">
              <NumberField
                icon={<Layers className="size-3" />}
                label="Séries"
                value={exercise.sets}
                min={1}
                max={20}
                onChange={(sets) => onUpdate({ sets })}
              />
              <NumberField
                icon={<span className="text-[10px] font-bold">×</span>}
                label="Reps"
                value={exercise.reps}
                min={1}
                max={500}
                onChange={(reps) => onUpdate({ reps })}
              />
              <NumberField
                icon={<Weight className="size-3" />}
                label="Carga"
                value={exercise.weight ?? 0}
                min={0}
                max={1000}
                step={2.5}
                suffix="kg"
                onChange={(weight) => onUpdate({ weight: weight > 0 ? weight : null })}
              />
              <NumberField
                icon={<Timer className="size-3" />}
                label="Descanso"
                value={exercise.restSeconds}
                min={0}
                max={600}
                step={15}
                suffix="s"
                onChange={(restSeconds) => onUpdate({ restSeconds })}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

function NumberField({
  icon,
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="truncate text-[10px] font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(Math.min(Math.max(next, min), max));
          }}
          className={cn("h-9 rounded-lg px-2 text-center text-sm", suffix && "pr-6")}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/** Instruções passo a passo de um exercício da biblioteca. */
export function ExerciseDetailDialog({
  exercise,
  onClose,
}: {
  exercise: LibraryExercise | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={exercise !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] max-w-sm overflow-y-auto rounded-3xl">
        {exercise && (
          <>
            <DialogHeader>
              <DialogTitle className="capitalize">{exercise.name}</DialogTitle>
            </DialogHeader>

            <ExerciseMedia exercise={exercise} className="mx-auto w-52" />

            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="rounded-full">
                {translateBodyPart(exercise.bodyPart)}
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                {translateEquipment(exercise.equipment)}
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                {translateMuscle(exercise.target)}
              </Badge>
            </div>

            {exercise.secondaryMuscles.length > 0 && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Também trabalha:</span>{" "}
                {exercise.secondaryMuscles.map(translateMuscle).join(", ")}
              </p>
            )}

            <div className="space-y-2.5 pt-1">
              <h4 className="text-sm font-semibold">Como executar</h4>
              {exercise.steps.map((step, index) => (
                <div key={index} className="flex gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>

            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Instruções em inglês, do dataset hasaneyldrm/exercises-dataset (MIT).
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Criação de um exercício fora da biblioteca.
 *
 * Para quando o movimento não está no catálogo — variação de academia,
 * exercício de fisioterapia, aparelho específico.
 */
function CustomExerciseDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (exercise: { name: string; bodyPart: string; equipment: string }) => void;
}) {
  const [name, setName] = useState("");
  const [bodyPart, setBodyPart] = useState<string>("chest");
  const [equipment, setEquipment] = useState<string>("body weight");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate({ name, bodyPart, equipment });
    setName("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>Criar exercício</DialogTitle>
        </DialogHeader>

        <div className="min-w-0 space-y-3.5 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="custom-name">Nome</Label>
            <Input
              id="custom-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Crucifixo inclinado na máquina"
              className="h-11 rounded-xl"
              autoFocus
            />
          </div>

          <div className="min-w-0 space-y-1.5">
            <Label>Região do corpo</Label>
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {(Object.keys(BODY_PART_PT) as BodyPart[]).map((part) => (
                <button
                  key={part}
                  type="button"
                  onClick={() => setBodyPart(part)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    bodyPart === part
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {BODY_PART_PT[part]}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 space-y-1.5">
            <Label>Equipamento</Label>
            <div className="no-scrollbar -mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1">
              {COMMON_EQUIPMENT.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setEquipment(item)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    equipment === item
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {translateEquipment(item)}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Exercícios criados por você não têm demonstração em vídeo — ela vem da
            biblioteca.
          </p>

          <ActionButton
            variant="strength"
            size="lg"
            full
            disabled={!name.trim()}
            onClick={handleCreate}
          >
            Adicionar ao treino
          </ActionButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Equipamentos mais comuns, para não listar os 28 do dataset. */
const COMMON_EQUIPMENT = [
  "body weight",
  "dumbbell",
  "barbell",
  "cable",
  "leverage machine",
  "smith machine",
  "kettlebell",
  "band",
  "medicine ball",
  "stability ball",
];
