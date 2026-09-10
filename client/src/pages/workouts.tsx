/**
 * Aba de treinos: planos salvos, montador de série e execução guiada.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Dumbbell,
  Flame,
  History,
  Pencil,
  Play,
  Plus,
  Timer,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
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
import { staggerContainer, staggerItem } from "@/lib/motion";
import { WorkoutBuilder } from "@/components/workout-builder";
import { WorkoutPlayer } from "@/components/workout-player";
import {
  useActiveWorkoutSession,
  useDeleteWorkoutPlan,
  useStartWorkoutSession,
  useWorkoutPlans,
  useWorkoutSessions,
} from "@/hooks/use-workouts";
import { translateBodyPart } from "@shared/exercises-library";
import { formatDuration } from "@shared/fasting";
import type { WorkoutPlanWithExercises } from "@shared/schema";

const WEEKDAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

type View =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "edit"; plan: WorkoutPlanWithExercises };

export default function WorkoutsPage() {
  const [view, setView] = useState<View>({ mode: "list" });
  const [planToDelete, setPlanToDelete] = useState<WorkoutPlanWithExercises | null>(null);

  const { data: plans, isLoading } = useWorkoutPlans();
  const { data: activeSession } = useActiveWorkoutSession();
  const { data: sessions } = useWorkoutSessions(10);

  const startSession = useStartWorkoutSession();
  const deletePlan = useDeleteWorkoutPlan();

  // O plano da sessão em andamento, para retomar o treino de onde parou.
  const activePlan = useMemo(
    () => plans?.find((plan) => plan.id === activeSession?.planId) ?? null,
    [plans, activeSession],
  );

  const weekStats = useMemo(() => {
    if (!sessions) return null;

    const weekAgo = Date.now() - 7 * 24 * 3600_000;
    const recent = sessions.filter(
      (session) => new Date(session.startedAt).getTime() >= weekAgo,
    );

    return {
      count: recent.length,
      minutes: Math.round(
        recent.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0) / 60,
      ),
      volume: recent.reduce((sum, session) => sum + (session.totalVolume ?? 0), 0),
    };
  }, [sessions]);

  // Um treino em andamento assume a tela inteira.
  if (activeSession && activePlan) {
    return (
      <WorkoutPlayer
        plan={activePlan}
        session={activeSession}
        onExit={() => setView({ mode: "list" })}
      />
    );
  }

  if (view.mode !== "list") {
    return (
      <PageShell
        title={view.mode === "edit" ? "Editar treino" : "Novo treino"}
        subtitle="Monte a série exercício por exercício"
        accent="strength"
        icon={<Dumbbell className="size-5" />}
        onBack={() => setView({ mode: "list" })}
      >
        <WorkoutBuilder
          plan={view.mode === "edit" ? view.plan : undefined}
          onDone={() => setView({ mode: "list" })}
          onCancel={() => setView({ mode: "list" })}
        />
      </PageShell>
    );
  }

  const handleStart = async (plan: WorkoutPlanWithExercises) => {
    try {
      await startSession.mutateAsync({ planId: plan.id });
    } catch (error) {
      toast({
        title: "Não foi possível iniciar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;

    try {
      await deletePlan.mutateAsync(planToDelete.id);
      toast({ title: "Treino excluído", description: planToDelete.name });
      setPlanToDelete(null);
    } catch (error) {
      toast({
        title: "Não foi possível excluir",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <PageShell
      title="Treinos"
      subtitle="Monte séries com 1.324 exercícios"
      accent="strength"
      icon={<Dumbbell className="size-5" />}
      actions={
        <ActionButton
          variant="ghost"
          size="icon"
          aria-label="Novo treino"
          onClick={() => setView({ mode: "create" })}
          className="text-white hover:bg-white/20 hover:text-white"
        >
          <Plus />
        </ActionButton>
      }
      headerContent={
        weekStats && weekStats.count > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            <HeaderStat
              icon={<Flame className="size-4" />}
              label="Semana"
              value={`${weekStats.count}`}
            />
            <HeaderStat
              icon={<Timer className="size-4" />}
              label="Tempo"
              value={formatDuration(weekStats.minutes)}
            />
            <HeaderStat
              icon={<TrendingUp className="size-4" />}
              label="Volume"
              value={`${Math.round(weekStats.volume / 1000)}t`}
            />
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="shimmer h-32 rounded-2xl bg-muted" />
          ))}
        </div>
      ) : plans && plans.length > 0 ? (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-3"
        >
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              starting={startSession.isPending}
              onStart={() => handleStart(plan)}
              onEdit={() => setView({ mode: "edit", plan })}
              onDelete={() => setPlanToDelete(plan)}
            />
          ))}

          <motion.div variants={staggerItem}>
            <ActionButton
              variant="outline"
              size="lg"
              full
              icon={<Plus />}
              onClick={() => setView({ mode: "create" })}
              className="border-dashed"
            >
              Criar outro treino
            </ActionButton>
          </motion.div>
        </motion.div>
      ) : (
        <EmptyState onCreate={() => setView({ mode: "create" })} />
      )}

      {/* -------------------------------------------------------- histórico */}
      {sessions && sessions.length > 0 && (
        <div className="mt-7">
          <div className="mb-2.5 flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Últimos treinos</h2>
          </div>

          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id} className="surface-card flex items-center gap-3 p-3">
                <div className="gradient-strength flex size-9 shrink-0 items-center justify-center rounded-xl text-white">
                  <Dumbbell className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{session.planName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.startedAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                    {" · "}
                    {formatDuration((session.durationSeconds ?? 0) / 60)}
                    {" · "}
                    {Math.round(session.caloriesBurned ?? 0)} kcal
                  </p>
                </div>

                <span className="display-number shrink-0 text-sm text-muted-foreground">
                  {Math.round(session.totalVolume ?? 0).toLocaleString("pt-BR")} kg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------- confirmar exclusão */}
      <Dialog open={planToDelete !== null} onOpenChange={(open) => !open && setPlanToDelete(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Excluir treino?</DialogTitle>
            <DialogDescription>
              “{planToDelete?.name}” será removido. Os treinos já realizados continuam no
              histórico.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2">
            <ActionButton variant="outline" full onClick={() => setPlanToDelete(null)}>
              Cancelar
            </ActionButton>
            <ActionButton
              variant="danger"
              full
              loading={deletePlan.isPending}
              onClick={handleDelete}
            >
              Excluir
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function PlanCard({
  plan,
  starting,
  onStart,
  onEdit,
  onDelete,
}: {
  plan: WorkoutPlanWithExercises;
  starting: boolean;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const totalSets = plan.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);

  // Regiões distintas trabalhadas, para resumir o foco do treino.
  const bodyParts = [...new Set(plan.exercises.map((exercise) => exercise.bodyPart))];

  return (
    <motion.div variants={staggerItem} className="surface-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">{plan.name}</h3>
            {plan.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {plan.description}
              </p>
            )}
          </div>

          <div className="flex shrink-0 gap-1">
            <ActionButton
              variant="ghost"
              size="icon"
              aria-label="Editar treino"
              className="size-8 text-muted-foreground"
              onClick={onEdit}
            >
              <Pencil className="size-4" />
            </ActionButton>
            <ActionButton
              variant="ghost"
              size="icon"
              aria-label="Excluir treino"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
            </ActionButton>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {plan.exercises.length} exercícios
          </Badge>
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {totalSets} séries
          </Badge>
          {bodyParts.slice(0, 2).map((part) => (
            <Badge key={part} variant="outline" className="rounded-full text-[10px]">
              {translateBodyPart(part)}
            </Badge>
          ))}
        </div>

        {plan.weekdays && plan.weekdays.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
            <div className="flex gap-1">
              {WEEKDAY_LETTERS.map((letter, day) => (
                <span
                  key={day}
                  className={cn(
                    "flex size-5 items-center justify-center rounded text-[10px] font-semibold",
                    plan.weekdays?.includes(day)
                      ? "bg-primary/15 text-primary"
                      : "bg-muted/60 text-muted-foreground/50",
                  )}
                >
                  {letter}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <ActionButton
        variant="strength"
        size="lg"
        full
        icon={<Play />}
        loading={starting}
        onClick={onStart}
        className="rounded-none rounded-b-2xl"
      >
        Iniciar treino
      </ActionButton>
    </motion.div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-10 text-center"
    >
      <div className="gradient-strength flex size-16 items-center justify-center rounded-3xl text-white shadow-lg shadow-rose-500/25">
        <Dumbbell className="size-8" />
      </div>

      <h2 className="mt-4 font-display text-xl font-bold">Monte seu primeiro treino</h2>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
        Escolha entre 1.324 exercícios, defina séries, repetições, carga e descanso — e
        execute com o cronômetro guiado.
      </p>

      <ActionButton
        variant="strength"
        size="lg"
        icon={<Plus />}
        onClick={onCreate}
        className="mt-5"
      >
        Criar treino
      </ActionButton>
    </motion.div>
  );
}

function HeaderStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-card rounded-2xl px-3 py-2.5 text-center">
      <div className="flex items-center justify-center text-white/70">{icon}</div>
      <p className="display-number mt-1 truncate text-base">{value}</p>
      <p className="truncate text-[10px] uppercase tracking-wide text-white/70">{label}</p>
    </div>
  );
}
