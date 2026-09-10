/**
 * Card de passos do dia.
 *
 * Mostra passos, distância e calorias, com anel de progresso até a meta.
 * Quando o sensor não está disponível (web, aparelho sem contador, permissão
 * negada), oferece entrada manual — o recurso não fica inútil.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Flame, Footprints, MapPin, Pencil, ShieldCheck } from "lucide-react";

import { ProgressRing } from "@/components/ui/progress-ring";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useStepSensor, useSyncSteps, useTodaySteps, useStepHistory, useStepDate } from "@/hooks/use-steps";
import { useCurrentUser } from "@/hooks/use-auth";
import { DEFAULT_STEP_GOAL, formatDistance, localDateKey, stepsToCalories, stepsToMeters } from "@shared/steps";

export function StepsCard({ goal: defaultGoal = DEFAULT_STEP_GOAL }: { goal?: number }) {
  const { data: today } = useTodaySteps();
  const { data: profile } = useCurrentUser();
  const { data: history, isError: historyError } = useStepHistory();
  const date = useStepDate();
  const { status, snapshot, error, pending, requestPermission, stopTracking, setGoal: saveNativeGoal } = useStepSensor(today?.steps ?? 0, profile?.id);
  const syncSteps = useSyncSteps();
  const [savedGoal, setSavedGoal] = useState(() => {
    try {
      const value = Number(localStorage.getItem("mynutrify:step-goal"));
      return Number.isInteger(value) && value >= 100 && value <= 100000 ? value : defaultGoal;
    } catch { return defaultGoal; }
  });
  const goal = snapshot?.goal ?? savedGoal;
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);

  const [editing, setEditing] = useState(false);
  const [manualSteps, setManualSteps] = useState("");

  const steps = Math.max(today?.date === date ? today.steps : 0, snapshot?.date === date ? snapshot.steps : 0);
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - i));
    const key = localDateKey(day);
    const total = Math.max(history?.find(row => row.date === key)?.steps ?? 0, snapshot?.history.find(row => row.date === key)?.steps ?? 0, key === date ? steps : 0);
    return { key, label: day.toLocaleDateString("pt-BR", { weekday: "short" }), total };
  });
  const saveGoal = async () => {
    const value = Number(goalInput);
    if (!Number.isInteger(value) || value < 100 || value > 100000) {
      toast({ title: "Informe uma meta entre 100 e 100.000 passos", variant: "destructive" });
      return;
    }
    setSavingGoal(true);
    try {
      await saveNativeGoal(value);
      localStorage.setItem("mynutrify:step-goal", String(value));
      setSavedGoal(value);
      setEditingGoal(false);
    } catch { toast({ title: "Não foi possível salvar a meta", variant: "destructive" }); }
    finally { setSavingGoal(false); }
  };
  const progress = goal > 0 ? steps / goal : 0;
  const reachedGoal = steps >= goal;

  const handleManualSave = async () => {
    const value = Number(manualSteps);

    if (!Number.isFinite(value) || value < 0) {
      toast({ title: "Informe um número válido", variant: "destructive" });
      return;
    }

    try {
      await syncSteps.mutateAsync({ steps: Math.round(value), source: "manual" });
      setEditing(false);
      setManualSteps("");
      toast({ title: "Passos atualizados" });
    } catch (error) {
      toast({
        title: "Não foi possível salvar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="surface-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="section-label">Passos de hoje</h2>

        {reachedGoal ? (
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            meta batida 🎉
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            faltam {Math.max(0, goal - steps).toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      <div className="flex items-center gap-5">
        <div className="glow-under shrink-0">
          <ProgressRing
            value={progress}
            size={124}
            strokeWidth={11}
            color={reachedGoal ? "hsl(160 84% 39%)" : "url(#stepsGradient)"}
          >
            <svg width="0" height="0" className="absolute" aria-hidden>
              <defs>
                <linearGradient id="stepsGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(24 95% 58%)" />
                  <stop offset="100%" stopColor="hsl(43 96% 56%)" />
                </linearGradient>
              </defs>
            </svg>

            <Footprints className="mb-0.5 size-4 text-muted-foreground" />
            <AnimatedNumber
              value={steps}
              className="display-number text-2xl leading-none"
              data-testid="text-steps-today"
            />
          </ProgressRing>
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          <Metric
            icon={<MapPin className="size-4" />}
            label="Distância estimada"
            value={formatDistance(stepsToMeters(steps, profile?.height, profile?.gender))}
          />
          <Metric
            icon={<Flame className="size-4" />}
            label="Calorias estimadas"
            value={`${stepsToCalories(steps, profile?.weight, profile?.height, profile?.gender)} kcal`}
            tone="text-orange-500"
          />
          <button type="button" className="text-xs text-muted-foreground underline underline-offset-4" onClick={() => { setGoalInput(String(goal)); setEditingGoal(true); }}>
            Meta: {goal.toLocaleString("pt-BR")} passos · editar
          </button>
        </div>
      </div>

      {editingGoal && <form className="mt-4 flex gap-2" onSubmit={event => { event.preventDefault(); void saveGoal(); }}>
        <Input aria-label="Meta diária de passos" type="number" min={100} max={100000} step={100} value={goalInput} onChange={event => setGoalInput(event.target.value)} />
        <ActionButton type="submit" size="sm" loading={savingGoal}>Salvar</ActionButton>
        <ActionButton type="button" variant="ghost" size="sm" onClick={() => setEditingGoal(false)}>Cancelar</ActionButton>
      </form>}

      {status.available && status.granted && <div className="mt-4 space-y-2">
        <p role="status" className="text-xs text-muted-foreground">
          {!status.enabled ? "Contagem pausada" : !snapshot?.tracking ? "Contagem interrompida" : snapshot.vehicle ? "Em veículo · contagem pausada" : !snapshot.updated ? "Aguardando sensor · dê alguns passos" : "Contando passos · também com o app fechado"}
          {pending && " · pendente de sincronização"}
        </p>
        {status.enabled && !status.notifications && <p className="text-xs text-amber-600">Permita notificações nas configurações do Android para ver o contador na barra de notificações.</p>}
        {snapshot?.tracking && !snapshot.filterAvailable && <p className="text-xs text-amber-600">Filtro de veículos indisponível neste momento.</p>}
        <ActionButton variant="outline" size="sm" full onClick={status.enabled && snapshot?.tracking ? stopTracking : requestPermission}>
          {status.enabled && snapshot?.tracking ? "Pausar contagem" : "Retomar contagem"}
        </ActionButton>
      </div>}
      {error && <p role="status" className="mt-2 text-xs text-amber-600">{error}</p>}

      <div className="mt-5 border-t border-border pt-4">
        <p className="mb-3 text-xs text-muted-foreground">Últimos 7 dias · {week.reduce((sum, day) => sum + day.total, 0).toLocaleString("pt-BR")} passos</p>
        <div className="grid grid-cols-7 gap-1" role="list" aria-label="Histórico semanal de passos">
          {week.map(day => <div key={day.key} role="listitem" aria-label={`${day.key}: ${day.total} passos`} className="flex min-w-0 flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums">{day.total.toLocaleString("pt-BR")}</span>
            <div className="flex h-12 w-5 items-end overflow-hidden rounded bg-muted">
              <div className={cn("w-full rounded", day.total >= goal ? "bg-emerald-500" : "bg-orange-400")} style={{ height: `${Math.min(100, day.total / goal * 100)}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{day.label}</span>
          </div>)}
        </div>
        {historyError && <p className="mt-2 text-xs text-muted-foreground">Histórico do servidor indisponível; mostrando os dados disponíveis no aparelho.</p>}
      </div>

      {/* -------------------------------------------------- estados do sensor */}
      {status.checked && status.available && !status.granted && (
        <ActionButton
          variant="soft"
          size="sm"
          full
          icon={<ShieldCheck />}
          className="mt-4"
          onClick={requestPermission}
        >
          Permitir contagem automática
        </ActionButton>
      )}

      {status.checked && !status.available && !editing && (
        <div className="mt-4 space-y-2">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Contagem automática indisponível neste ambiente — registre manualmente.
          </p>
          <ActionButton
            variant="outline"
            size="sm"
            full
            icon={<Pencil />}
            onClick={() => {
              setManualSteps(String(steps || ""));
              setEditing(true);
            }}
          >
            Informar passos
          </ActionButton>
        </div>
      )}

      {editing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 flex gap-2 overflow-hidden"
        >
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={200000}
            value={manualSteps}
            onChange={(event) => setManualSteps(event.target.value)}
            placeholder="8000"
            className="h-10 rounded-xl"
            autoFocus
          />
          <ActionButton
            variant="brand"
            size="icon"
            aria-label="Salvar passos"
            className="size-10 shrink-0"
            loading={syncSteps.isPending}
            onClick={handleManualSave}
          >
            <Check />
          </ActionButton>
        </motion.div>
      )}
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("display-number ml-auto text-base", tone)}>{value}</span>
    </div>
  );
}
