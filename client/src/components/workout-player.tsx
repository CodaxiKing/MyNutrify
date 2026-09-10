/**
 * Execução guiada de um treino.
 *
 * Percorre os exercícios do plano, registra cada série (reps e carga) e dispara
 * o cronômetro de descanso ao concluir uma série. O tempo total da sessão vem
 * do `startedAt` gravado no servidor, então continua correto depois de um
 * reload no meio do treino.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  Info,
  Pause,
  Play,
  Plus,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-url";
import { ExerciseDetailDialog } from "@/components/workout-builder";
import { ExerciseMedia } from "@/components/exercise-media";
import {
  useCancelWorkoutSession,
  useFinishWorkoutSession,
} from "@/hooks/use-workouts";
import type { WorkoutPlanWithExercises, WorkoutSessionWithLogs } from "@shared/schema";
import { translateEquipment, translateMuscle, type LibraryExercise } from "@shared/exercises-library";
import { formatClock } from "@shared/fasting";

/** Uma série em execução. */
interface SetState {
  reps: number;
  weight: number | null;
  done: boolean;
}

export interface WorkoutPlayerProps {
  plan: WorkoutPlanWithExercises;
  session: WorkoutSessionWithLogs;
  onExit: () => void;
}

/**
 * Chave de rascunho da sessão.
 *
 * As séries marcadas só vão para o banco ao finalizar o treino, então um reload
 * no meio (tela apagando, app em segundo plano) perderia tudo. O rascunho fica
 * no localStorage e é limpo ao finalizar ou descartar.
 */
function draftKey(sessionId: string) {
  return `mynutrify:workout-draft:${sessionId}`;
}

function clearDraft(sessionId: string) {
  try {
    localStorage.removeItem(draftKey(sessionId));
  } catch {
    // Nada a fazer se o storage estiver indisponível.
  }
}

function buildInitialSets(plan: WorkoutPlanWithExercises): Record<string, SetState[]> {
  return Object.fromEntries(
    plan.exercises.map((exercise) => [
      exercise.id,
      Array.from({ length: exercise.sets }, () => ({
        reps: exercise.reps,
        weight: exercise.weight,
        done: false,
      })),
    ]),
  );
}

export function WorkoutPlayer({ plan, session, onExit }: WorkoutPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sets, setSets] = useState<Record<string, SetState[]>>(() => {
    const fresh = buildInitialSets(plan);

    try {
      const stored = localStorage.getItem(draftKey(session.id));
      if (!stored) return fresh;

      const draft = JSON.parse(stored) as Record<string, SetState[]>;

      // Só reaproveita os exercícios que ainda existem no plano — ele pode ter
      // sido editado em outro dispositivo enquanto o treino rodava.
      return Object.fromEntries(
        Object.entries(fresh).map(([id, defaultSets]) => [
          id,
          Array.isArray(draft[id]) && draft[id].length > 0 ? draft[id] : defaultSets,
        ]),
      );
    } catch {
      // localStorage indisponível (modo privado, cota cheia): começa do zero.
      return fresh;
    }
  });

  // Grava o rascunho a cada mudança.
  useEffect(() => {
    try {
      localStorage.setItem(draftKey(session.id), JSON.stringify(sets));
    } catch {
      // Sem persistência o treino continua funcionando normalmente.
    }
  }, [sets, session.id]);

  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [showFinish, setShowFinish] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [detail, setDetail] = useState<LibraryExercise | null>(null);

  const finishSession = useFinishWorkoutSession();
  const cancelSession = useCancelWorkoutSession();

  const current = plan.exercises[currentIndex];
  const currentSets = sets[current.id] ?? [];

  const elapsed = useElapsedSeconds(new Date(session.startedAt));

  const totals = useMemo(() => {
    const all = Object.values(sets).flat();
    const done = all.filter((set) => set.done);
    return {
      totalSets: all.length,
      doneSets: done.length,
      volume: done.reduce((sum, set) => sum + (set.weight ?? 0) * set.reps, 0),
    };
  }, [sets]);

  const updateSet = (setIndex: number, patch: Partial<SetState>) => {
    setSets((current_) => ({
      ...current_,
      [current.id]: current_[current.id].map((set, index) =>
        index === setIndex ? { ...set, ...patch } : set,
      ),
    }));
  };

  const toggleSet = (setIndex: number) => {
    const wasDone = currentSets[setIndex].done;
    updateSet(setIndex, { done: !wasDone });

    // Concluir uma série inicia o descanso; desmarcar não.
    if (!wasDone && current.restSeconds > 0) {
      setRestSeconds(current.restSeconds);
    }
  };

  const addSet = () => {
    setSets((current_) => ({
      ...current_,
      [current.id]: [
        ...current_[current.id],
        {
          reps: current.reps,
          weight: current.weight,
          done: false,
        },
      ],
    }));
  };

  const goTo = (index: number) => {
    setCurrentIndex(Math.min(Math.max(index, 0), plan.exercises.length - 1));
    setRestSeconds(null);
  };

  const handleFinish = async () => {
    try {
      const setLogs = plan.exercises.flatMap((exercise) =>
        (sets[exercise.id] ?? []).map((set, index) => ({
          libraryExerciseId: exercise.libraryExerciseId,
          exerciseName: exercise.name,
          setNumber: index + 1,
          reps: set.reps,
          weight: set.weight,
          completed: set.done,
        })),
      );

      const result = await finishSession.mutateAsync({ id: session.id, setLogs });

      clearDraft(session.id);

      toast({
        title: "Treino concluído! 💪",
        description: `${totals.doneSets} séries · ${Math.round(result.totalVolume ?? 0).toLocaleString("pt-BR")} kg de volume · ${Math.round(result.caloriesBurned ?? 0)} kcal.`,
      });

      onExit();
    } catch (error) {
      toast({
        title: "Não foi possível finalizar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    try {
      await cancelSession.mutateAsync(session.id);
      clearDraft(session.id);
      toast({ title: "Treino descartado" });
      onExit();
    } catch (error) {
      toast({
        title: "Não foi possível descartar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="page-content min-h-screen bg-background">
      {/* ------------------------------------------------------------ header */}
      <header className="gradient-strength grain relative overflow-hidden rounded-b-[2rem] px-5 pb-5 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full bg-white/15 blur-2xl"
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="section-label text-white/70">Em treino</p>
            <h1 className="truncate font-display text-[1.35rem] font-bold leading-tight">
              {plan.name}
            </h1>
          </div>

          <ActionButton
            variant="ghost"
            size="icon"
            aria-label="Descartar treino"
            onClick={() => setShowCancel(true)}
            className="shrink-0 text-white hover:bg-white/20 hover:text-white"
          >
            <X />
          </ActionButton>
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <HeaderStat label="Tempo" value={formatClock(elapsed)} />
          <HeaderStat label="Séries" value={`${totals.doneSets}/${totals.totalSets}`} />
          <HeaderStat
            label="Volume"
            value={`${Math.round(totals.volume).toLocaleString("pt-BR")} kg`}
          />
        </div>
      </header>

      <div className="px-4 pt-5">
        {/* ------------------------------------------------- trilha de progresso */}
        <div className="no-scrollbar -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4">
          {plan.exercises.map((exercise, index) => {
            const exerciseSets = sets[exercise.id] ?? [];
            const allDone = exerciseSets.length > 0 && exerciseSets.every((set) => set.done);

            return (
              <button
                key={exercise.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={exercise.name}
                className={cn(
                  "h-1.5 min-w-8 flex-1 rounded-full transition-colors",
                  allDone
                    ? "bg-emerald-500"
                    : index === currentIndex
                      ? "bg-primary"
                      : "bg-muted",
                )}
              />
            );
          })}
        </div>

        {/* ---------------------------------------------------- exercício atual */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  Exercício {currentIndex + 1} de {plan.exercises.length}
                </p>
                <h2 className="font-display text-xl font-bold capitalize leading-tight">
                  {current.name}
                </h2>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="rounded-full text-[10px]">
                    {translateMuscle(current.target)}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full text-[10px]">
                    {translateEquipment(current.equipment)}
                  </Badge>
                </div>
              </div>

              <ActionButton
                variant="outline"
                size="icon"
                aria-label="Ver instruções"
                className="shrink-0"
                onClick={async () => {
                  const response = await apiFetch(`/api/exercise-library/${current.libraryExerciseId}`,
                    { credentials: "include" },
                  );
                  if (response.ok) setDetail(await response.json());
                }}
              >
                <Info />
              </ActionButton>
            </div>

            {/* Demonstração do movimento. Durante o treino é a informação mais
                útil da tela — mais que o texto, que exigiria parar para ler. */}
            {current.libraryExerciseId && current.mediaId && (
              <ExerciseMedia
                exercise={{
                  id: current.libraryExerciseId,
                  name: current.name,
                  mediaId: current.mediaId,
                }}
                className="mx-auto mb-3 w-full max-w-[15rem]"
              />
            )}

            {current.notes && (
              <p className="mb-3 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
                {current.notes}
              </p>
            )}

            {/* ------------------------------------------------------- séries */}
            <div className="space-y-2">
              {currentSets.map((set, index) => (
                <motion.div
                  key={index}
                  layout
                  className={cn(
                    "surface-card flex items-center gap-2.5 p-3 transition-colors",
                    set.done && "border-emerald-500/40 bg-emerald-500/5",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                      set.done
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </div>

                  <div className="flex flex-1 items-center gap-2">
                    <div className="flex-1">
                      <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">
                        Reps
                      </label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={500}
                        value={set.reps}
                        onChange={(event) =>
                          updateSet(index, { reps: Math.max(0, Number(event.target.value)) })
                        }
                        className="h-9 rounded-lg text-center"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">
                        Carga (kg)
                      </label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={1000}
                        step={2.5}
                        value={set.weight ?? ""}
                        placeholder="—"
                        onChange={(event) => {
                          const value = event.target.value;
                          updateSet(index, {
                            weight: value === "" ? null : Math.max(0, Number(value)),
                          });
                        }}
                        className="h-9 rounded-lg text-center"
                      />
                    </div>
                  </div>

                  <ActionButton
                    variant={set.done ? "fresh" : "outline"}
                    size="icon"
                    aria-label={set.done ? "Desmarcar série" : "Concluir série"}
                    className="mt-4 size-10 shrink-0"
                    onClick={() => toggleSet(index)}
                  >
                    <Check />
                  </ActionButton>
                </motion.div>
              ))}

              <ActionButton
                variant="ghost"
                size="sm"
                full
                icon={<Plus />}
                onClick={addSet}
                className="border border-dashed border-border"
              >
                Adicionar série
              </ActionButton>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* -------------------------------------------------------- navegação */}
        <div className="mt-5 flex gap-2.5">
          <ActionButton
            variant="outline"
            size="lg"
            icon={<ChevronLeft />}
            disabled={currentIndex === 0}
            onClick={() => goTo(currentIndex - 1)}
            className="flex-1"
          >
            Anterior
          </ActionButton>

          {currentIndex === plan.exercises.length - 1 ? (
            <ActionButton
              variant="fresh"
              size="lg"
              icon={<Flag />}
              onClick={() => setShowFinish(true)}
              className="flex-1"
            >
              Finalizar
            </ActionButton>
          ) : (
            <ActionButton
              variant="strength"
              size="lg"
              trailingIcon={<ChevronRight />}
              onClick={() => goTo(currentIndex + 1)}
              className="flex-1"
            >
              Próximo
            </ActionButton>
          )}
        </div>
      </div>

      {/* --------------------------------------------- cronômetro de descanso */}
      <AnimatePresence>
        {restSeconds !== null && (
          <RestTimer
            seconds={restSeconds}
            onAddTime={() => setRestSeconds((value) => (value ?? 0) + 30)}
            onDismiss={() => setRestSeconds(null)}
          />
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------- confirmações */}
      <Dialog open={showFinish} onOpenChange={setShowFinish}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Finalizar treino?</DialogTitle>
            <DialogDescription>
              {totals.doneSets} de {totals.totalSets} séries concluídas em{" "}
              {formatClock(elapsed)}. As séries não marcadas não entram no volume.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2">
            <ActionButton variant="outline" full onClick={() => setShowFinish(false)}>
              Continuar treinando
            </ActionButton>
            <ActionButton
              variant="fresh"
              full
              loading={finishSession.isPending}
              onClick={handleFinish}
            >
              Finalizar
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Descartar treino?</DialogTitle>
            <DialogDescription>
              Esta sessão será apagada e nada será registrado no seu histórico.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2">
            <ActionButton variant="outline" full onClick={() => setShowCancel(false)}>
              Voltar
            </ActionButton>
            <ActionButton
              variant="danger"
              full
              loading={cancelSession.isPending}
              onClick={handleCancel}
            >
              Descartar
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExerciseDetailDialog exercise={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

/**
 * Cronômetro de descanso entre séries.
 *
 * Ancorado no horário de término, não num contador decrescente, para que a
 * contagem não atrase quando o navegador estrangula os timers da aba.
 */
function RestTimer({
  seconds,
  onAddTime,
  onDismiss,
}: {
  seconds: number;
  onAddTime: () => void;
  onDismiss: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const endsAtRef = useRef(Date.now() + seconds * 1000);
  const notifiedRef = useRef(false);

  // Quando o usuário adiciona tempo, o alvo se move junto.
  useEffect(() => {
    endsAtRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    notifiedRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (paused) return;

    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      setRemaining(left);

      if (left === 0 && !notifiedRef.current) {
        notifiedRef.current = true;
        // Vibração curta é mais discreta que som na academia.
        navigator.vibrate?.([120, 60, 120]);
      }
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [paused]);

  // Enquanto pausado, o alvo acompanha o relógio para não "correr" ao retomar.
  useEffect(() => {
    if (!paused) return;
    const frozen = remaining;
    const id = window.setInterval(() => {
      endsAtRef.current = Date.now() + frozen * 1000;
    }, 200);
    return () => window.clearInterval(id);
  }, [paused, remaining]);

  const isDone = remaining === 0;

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="fixed inset-x-0 z-50 mx-auto max-w-md px-4"
      style={{
        bottom:
          "calc(var(--bottom-nav-height) + max(env(safe-area-inset-bottom, 0px), 1.25rem) + 0.75rem)",
      }}
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-3xl border p-3 shadow-card-lg backdrop-blur-xl",
          isDone
            ? "border-emerald-500/40 bg-emerald-500/95 text-white"
            : "border-border bg-card/95",
        )}
      >
        <ProgressRing
          value={seconds > 0 ? 1 - remaining / seconds : 1}
          size={52}
          strokeWidth={5}
          color={isDone ? "white" : "hsl(var(--ring))"}
          trackClassName={isDone ? "text-white/30" : "text-muted"}
        >
          <span className="clock-number text-xs">{remaining}</span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {isDone ? "Descanso concluído" : "Descansando"}
          </p>
          <p className={cn("text-xs", isDone ? "text-white/80" : "text-muted-foreground")}>
            {isDone ? "Pronto para a próxima série" : `${remaining}s restantes`}
          </p>
        </div>

        {!isDone && (
          <>
            <ActionButton
              variant="ghost"
              size="icon"
              aria-label={paused ? "Retomar descanso" : "Pausar descanso"}
              className="size-9 shrink-0"
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? <Play /> : <Pause />}
            </ActionButton>

            <ActionButton
              variant="ghost"
              size="icon"
              aria-label="Adicionar 30 segundos"
              className="size-9 shrink-0"
              onClick={onAddTime}
            >
              <Plus />
            </ActionButton>
          </>
        )}

        <ActionButton
          variant={isDone ? "ghost" : "soft"}
          size="sm"
          className={cn("shrink-0", isDone && "text-white hover:bg-white/20")}
          onClick={onDismiss}
        >
          {isDone ? "Ok" : "Pular"}
        </ActionButton>
      </div>
    </motion.div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-2xl px-2 py-2 text-center">
      <p className="clock-number truncate text-sm">{value}</p>
      <p className="truncate text-[10px] uppercase tracking-wide text-white/70">{label}</p>
    </div>
  );
}

/** Segundos decorridos desde `start`, atualizados a cada segundo. */
function useElapsedSeconds(start: Date) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000)),
  );

  useEffect(() => {
    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000)));

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [start]);

  return elapsed;
}
