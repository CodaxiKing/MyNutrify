/**
 * Aba de jejum intermitente.
 *
 * Sem jejum ativo: escolha do protocolo (16:8, 18:6, 20:4, OMAD, 24h, 36h ou
 * personalizado) com ajuste de horário de início.
 * Com jejum ativo: cronômetro regressivo, fase metabólica atual e o encerramento.
 */

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  Bell,
  BellRing,
  CalendarClock,
  ChevronRight,
  Flame,
  History,
  Info,
  Sparkles,
  Timer,
  Trash2,
  TrendingUp,
  Trophy,
  Utensils,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { ActionButton } from "@/components/ui/action-button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/motion";
import {
  useActiveFasting,
  useDeleteFasting,
  useEndFasting,
  useFastingCompletionNotice,
  useFastingHistory,
  useFastingTimer,
  useStartFasting,
} from "@/hooks/use-fasting";
import {
  FASTING_PHASES,
  FASTING_PROTOCOLS,
  formatClock,
  formatDuration,
  type FastingProtocolId,
} from "@shared/fasting";

const LEVEL_STYLE: Record<string, string> = {
  iniciante: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "intermediário": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "avançado": "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export default function FastingPage() {
  const { data: active, isLoading } = useActiveFasting();
  const { data: history } = useFastingHistory();
  const timer = useFastingTimer(active);

  useFastingCompletionNotice(active, timer);

  const startFasting = useStartFasting();
  const endFasting = useEndFasting();
  const deleteFasting = useDeleteFasting();

  const [setupProtocol, setSetupProtocol] = useState<FastingProtocolId | null>(null);
  const [customHours, setCustomHours] = useState(14);
  const [startOffsetHours, setStartOffsetHours] = useState(0);
  const [showPhases, setShowPhases] = useState(false);

  // O Radix mantém o conteúdo montado durante a animação de fechamento. Sem
  // guardar o último protocolo, o diálogo pisca "Meta 0min" ao ser fechado.
  const lastProtocolRef = useRef(FASTING_PROTOCOLS[0]);

  const selectedProtocol = useMemo(() => {
    const found = FASTING_PROTOCOLS.find((p) => p.id === setupProtocol);
    if (found) lastProtocolRef.current = found;
    return found ?? lastProtocolRef.current;
  }, [setupProtocol]);

  const targetMinutes =
    selectedProtocol.id === "custom"
      ? Math.round(customHours * 60)
      : selectedProtocol.fastMinutes;

  const handleStart = async () => {
    if (setupProtocol === null) return;

    try {
      await startFasting.mutateAsync({
        protocol: selectedProtocol.id,
        targetMinutes,
        // Permite registrar que a última refeição foi há algumas horas.
        startedAt:
          startOffsetHours > 0
            ? new Date(Date.now() - startOffsetHours * 3600_000)
            : undefined,
      });

      setSetupProtocol(null);
      setStartOffsetHours(0);

      toast({
        title: "Jejum iniciado",
        description: `${selectedProtocol.name} — meta de ${formatDuration(targetMinutes)}.`,
      });

      // Pede permissão de notificação só depois de o usuário demonstrar
      // interesse iniciando um jejum.
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    } catch (error) {
      toast({
        title: "Não foi possível iniciar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEnd = async () => {
    if (!active || !timer) return;

    try {
      await endFasting.mutateAsync({ id: active.id });

      toast({
        title: timer.isComplete ? "Jejum concluído! 🎉" : "Jejum encerrado",
        description: timer.isComplete
          ? `Você completou ${formatDuration(timer.elapsedSeconds / 60)}.`
          : `Você jejuou ${formatDuration(timer.elapsedSeconds / 60)} de ${formatDuration(timer.targetSeconds / 60)}.`,
      });
    } catch (error) {
      toast({
        title: "Não foi possível encerrar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const stats = history?.stats;

  return (
    <PageShell
      title="Jejum intermitente"
      subtitle={active ? "Jejum em andamento" : "Escolha um protocolo e comece"}
      accent="fasting"
      icon={<Timer className="size-5" />}
      actions={
        <ActionButton
          variant="ghost"
          size="icon"
          onClick={() => setShowPhases(true)}
          aria-label="Entenda as fases do jejum"
          className="text-white hover:bg-white/20 hover:text-white"
        >
          <Info />
        </ActionButton>
      }
      headerContent={
        stats && stats.totalSessions > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            <HeaderStat
              icon={<Flame className="size-4" />}
              label="Sequência"
              value={`${stats.currentStreak}`}
            />
            <HeaderStat
              icon={<Trophy className="size-4" />}
              label="Recorde"
              value={formatDuration(stats.longestMinutes)}
            />
            <HeaderStat
              icon={<TrendingUp className="size-4" />}
              label="Conclusão"
              value={`${Math.round(stats.successRate * 100)}%`}
            />
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <div className="shimmer h-64 rounded-3xl bg-muted" />
          <div className="shimmer h-24 rounded-2xl bg-muted" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {active && timer ? (
            <motion.div
              key="active"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="space-y-5"
            >
              {/* ------------------------------------------------ cronômetro */}
              <div className="glow-under relative flex flex-col items-center pt-2">
                {timer.isComplete && (
                  <div
                    aria-hidden
                    className="animate-breathe absolute top-6 size-56 rounded-full bg-emerald-500/25 blur-3xl"
                  />
                )}

                <ProgressRing
                  value={timer.progress}
                  size={244}
                  strokeWidth={16}
                  color={timer.isComplete ? "hsl(160 84% 39%)" : "url(#fastingGradient)"}
                >
                  <svg width="0" height="0" className="absolute" aria-hidden>
                    <defs>
                      <linearGradient id="fastingGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="hsl(262 83% 62%)" />
                        <stop offset="100%" stopColor="hsl(292 76% 58%)" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <span className="section-label">
                    {timer.isComplete ? "Meta atingida" : "Restam"}
                  </span>

                  <span
                    className={cn(
                      "clock-number mt-1.5 text-[2.6rem] leading-none",
                      timer.isComplete && "text-emerald-500",
                    )}
                  >
                    {timer.isComplete
                      ? formatClock(timer.overtimeSeconds)
                      : formatClock(timer.remainingSeconds)}
                  </span>

                  <span className="mt-1.5 text-sm text-muted-foreground">
                    {formatDuration(timer.elapsedSeconds / 60)} de{" "}
                    {formatDuration(timer.targetSeconds / 60)}
                  </span>

                  {timer.isComplete && (
                    <span className="mt-1 text-xs font-medium text-emerald-500">
                      em tempo extra
                    </span>
                  )}
                </ProgressRing>

                <Badge variant="secondary" className="mt-4 gap-1.5 rounded-full px-3 py-1">
                  <Sparkles className="size-3.5" />
                  {timer.protocolName}
                </Badge>
              </div>

              {/* ------------------------------------------ fase metabólica */}
              <Card className="surface-card overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="gradient-fasting flex size-10 shrink-0 items-center justify-center rounded-xl text-white">
                      <Flame className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold">{timer.phase.name}</h3>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          fase atual
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {timer.phase.description}
                      </p>

                      {timer.nextPhase && (
                        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <ChevronRight className="size-3.5" />
                          <span>
                            <strong className="font-medium text-foreground">
                              {timer.nextPhase.name}
                            </strong>{" "}
                            em{" "}
                            {formatDuration(
                              timer.nextPhase.startHour * 60 - timer.elapsedSeconds / 60,
                            )}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* --------------------------------------------- início / fim */}
              <div className="grid grid-cols-2 gap-3">
                <InfoTile
                  icon={<CalendarClock className="size-4" />}
                  label="Começou"
                  value={timer.startedAt.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  hint={timer.startedAt.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                />
                <InfoTile
                  icon={<Utensils className="size-4" />}
                  label={timer.isComplete ? "Podia comer desde" : "Pode comer às"}
                  value={timer.endsAt.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  hint={timer.endsAt.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                />
              </div>

              <ActionButton
                variant={timer.isComplete ? "fresh" : "outline"}
                size="lg"
                full
                loading={endFasting.isPending}
                onClick={handleEnd}
                icon={timer.isComplete ? <Utensils /> : <AlarmClock />}
              >
                {timer.isComplete ? "Encerrar e abrir a janela" : "Encerrar jejum agora"}
              </ActionButton>

              {!timer.isComplete && (
                <p className="text-center text-xs text-muted-foreground">
                  Encerrar antes da meta registra o jejum como interrompido.
                </p>
              )}
            </motion.div>
          ) : (
            /* ------------------------------------ escolha de protocolo */
            <motion.div
              key="idle"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              <motion.div variants={staggerItem}>
                <h2 className="mb-1 font-display text-xl font-bold">Escolha seu protocolo</h2>
                <p className="mb-3 text-sm text-muted-foreground">
                  O cronômetro continua correndo com o app fechado.
                </p>
              </motion.div>

              {FASTING_PROTOCOLS.map((protocol) => (
                <motion.button
                  key={protocol.id}
                  variants={staggerItem}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSetupProtocol(protocol.id);
                    setCustomHours(protocol.fastMinutes / 60);
                  }}
                  className="surface-card flex w-full items-center gap-3 p-4 text-left transition-colors hover:border-primary/40"
                >
                  <div className="gradient-fasting flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl text-white">
                    <span className="display-number text-sm leading-none">
                      {protocol.id === "custom"
                        ? "∞"
                        : `${Math.round(protocol.fastMinutes / 60)}h`}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">{protocol.name}</h3>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          LEVEL_STYLE[protocol.level],
                        )}
                      >
                        {protocol.level}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {protocol.description}
                    </p>
                  </div>

                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </motion.button>
              ))}

              {history && history.sessions.length > 0 && (
                <motion.div variants={staggerItem} className="pt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <History className="size-4 text-muted-foreground" />
                    <h2 className="text-base font-semibold">Histórico</h2>
                  </div>

                  <div className="space-y-2">
                    {history.sessions.slice(0, 10).map((session) => {
                      const minutes = session.endedAt
                        ? (new Date(session.endedAt).getTime() -
                            new Date(session.startedAt).getTime()) /
                          60000
                        : 0;

                      return (
                        <div
                          key={session.id}
                          className="surface-card flex items-center gap-3 p-3"
                        >
                          <div
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-xl",
                              session.status === "completed"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {session.status === "completed" ? (
                              <Trophy className="size-4" />
                            ) : (
                              <Timer className="size-4" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {formatDuration(minutes)}
                              <span className="ml-1.5 font-normal text-muted-foreground">
                                / {formatDuration(session.targetMinutes)}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(session.startedAt).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>

                          <ActionButton
                            variant="ghost"
                            size="icon"
                            aria-label="Remover do histórico"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteFasting.mutate(session.id)}
                          >
                            <Trash2 className="size-4" />
                          </ActionButton>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ------------------------------------------- diálogo de configuração */}
      <Dialog open={setupProtocol !== null} onOpenChange={(open) => !open && setSetupProtocol(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>{selectedProtocol.name}</DialogTitle>
            <DialogDescription>{selectedProtocol.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {selectedProtocol.id === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="custom-hours">Duração do jejum (horas)</Label>
                <Input
                  id="custom-hours"
                  type="number"
                  min={1}
                  max={168}
                  step={0.5}
                  value={customHours}
                  onChange={(event) => setCustomHours(Number(event.target.value))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="start-offset">Última refeição foi há…</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="start-offset"
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={startOffsetHours}
                  onChange={(event) =>
                    setStartOffsetHours(Math.max(0, Number(event.target.value)))
                  }
                />
                <span className="shrink-0 text-sm text-muted-foreground">horas</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Deixe em 0 para começar a contar agora.
              </p>
            </div>

            <div className="rounded-2xl bg-muted/60 p-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Meta</span>
                <span className="font-semibold">{formatDuration(targetMinutes)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Termina às</span>
                <span className="font-semibold">
                  {new Date(
                    Date.now() + (targetMinutes - startOffsetHours * 60) * 60_000,
                  ).toLocaleString("pt-BR", {
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <ActionButton
              variant="fasting"
              size="lg"
              full
              loading={startFasting.isPending}
              onClick={handleStart}
              icon={<Timer />}
            >
              Iniciar jejum
            </ActionButton>

            {typeof Notification !== "undefined" && Notification.permission === "granted" ? (
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <BellRing className="size-3.5" />
                Você será avisado quando a meta for atingida.
              </p>
            ) : (
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Bell className="size-3.5" />
                Permita notificações para ser avisado no fim.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------- diálogo com as fases */}
      <Dialog open={showPhases} onOpenChange={setShowPhases}>
        <DialogContent className="max-h-[80vh] max-w-sm overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Fases do jejum</DialogTitle>
            <DialogDescription>
              Referências aproximadas — o tempo exato varia conforme a pessoa, a última
              refeição e o nível de atividade.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            {FASTING_PHASES.map((phase) => (
              <div key={phase.name} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="gradient-fasting flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                    {phase.startHour}h
                  </div>
                  <div className="mt-1 w-px flex-1 bg-border last:hidden" />
                </div>
                <div className="pb-1">
                  <h4 className="text-sm font-semibold">{phase.name}</h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {phase.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-2 rounded-xl bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
            O jejum intermitente não é indicado para todo mundo. Consulte um profissional de
            saúde antes de começar, especialmente em caso de diabetes, gravidez, amamentação
            ou histórico de transtorno alimentar.
          </p>
        </DialogContent>
      </Dialog>
    </PageShell>
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
      <div className="flex items-center justify-center gap-1 text-white/70">{icon}</div>
      <p className="display-number mt-1 truncate text-base">{value}</p>
      <p className="truncate text-[10px] uppercase tracking-wide text-white/70">{label}</p>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="surface-card p-3.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="truncate text-xs">{label}</span>
      </div>
      <p className="display-number mt-1 text-xl">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
