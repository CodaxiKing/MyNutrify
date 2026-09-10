/**
 * Estado do jejum intermitente.
 *
 * O cronômetro nunca guarda "tempo restante": ele é sempre recalculado a partir
 * de `startedAt` + `targetMinutes`. Por isso o jejum continua correndo com o app
 * fechado, em segundo plano ou depois de um reload — ao voltar, o valor já está
 * certo, sem precisar de nenhuma sincronização.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { FastingSession } from "@shared/schema";
import {
  getCurrentPhase,
  getNextPhase,
  getProtocol,
  type FastingProtocolId,
} from "@shared/fasting";

export interface FastingHistory {
  sessions: FastingSession[];
  stats: {
    totalSessions: number;
    completedSessions: number;
    successRate: number;
    currentStreak: number;
    longestMinutes: number;
    totalMinutes: number;
    averageMinutes: number;
  };
}

const ACTIVE_KEY = ["/api/fasting/active"] as const;
const HISTORY_KEY = ["/api/fasting/history"] as const;

/** Sessão de jejum em andamento, ou null. */
export function useActiveFasting() {
  return useQuery<FastingSession | null>({
    queryKey: ACTIVE_KEY,
    // O jejum roda por horas; um refetch por minuto basta para corrigir
    // divergências entre dispositivos.
    refetchInterval: 60_000,
  });
}

export function useFastingHistory() {
  return useQuery<FastingHistory>({ queryKey: HISTORY_KEY });
}

export function useStartFasting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      protocol: FastingProtocolId;
      targetMinutes: number;
      startedAt?: Date;
      notes?: string | null;
    }) => {
      const response = await apiRequest("POST", "/api/fasting/start", {
        ...input,
        startedAt: input.startedAt?.toISOString(),
      });
      return (await response.json()) as FastingSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACTIVE_KEY });
      queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

export function useEndFasting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string | null }) => {
      const response = await apiRequest("POST", `/api/fasting/${id}/end`, { notes });
      return (await response.json()) as FastingSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACTIVE_KEY });
      queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

export function useDeleteFasting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/fasting/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

export interface FastingTimer {
  elapsedSeconds: number;
  remainingSeconds: number;
  targetSeconds: number;
  /** 0 a 1 (limitado a 1 mesmo depois de passar da meta). */
  progress: number;
  /** Já bateu a duração alvo. */
  isComplete: boolean;
  /** Quanto passou da meta, em segundos. */
  overtimeSeconds: number;
  startedAt: Date;
  /** Horário previsto de término. */
  endsAt: Date;
  phase: ReturnType<typeof getCurrentPhase>;
  nextPhase: ReturnType<typeof getNextPhase>;
  protocolName: string;
}

/**
 * Cronômetro ao vivo derivado da sessão ativa.
 *
 * Faz um tick por segundo apenas para redesenhar — o valor em si vem sempre da
 * diferença entre `Date.now()` e `startedAt`, então um tick perdido (aba em
 * segundo plano, throttling do navegador) não atrasa a contagem.
 */
export function useFastingTimer(session: FastingSession | null | undefined): FastingTimer | null {
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<number | null>(null);

  const tick = useCallback(() => setNow(Date.now()), []);

  useEffect(() => {
    if (!session) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    tick();
    intervalRef.current = window.setInterval(tick, 1000);

    // Navegadores congelam timers em abas ocultas; recalcular ao voltar evita
    // que o relógio apareça atrasado por alguns segundos.
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session, tick]);

  return useMemo(() => {
    if (!session) return null;

    const startedAt = new Date(session.startedAt);
    const targetSeconds = session.targetMinutes * 60;
    const elapsedSeconds = Math.max(0, Math.floor((now - startedAt.getTime()) / 1000));
    const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
    const isComplete = elapsedSeconds >= targetSeconds;

    return {
      elapsedSeconds,
      remainingSeconds,
      targetSeconds,
      progress: targetSeconds > 0 ? Math.min(elapsedSeconds / targetSeconds, 1) : 0,
      isComplete,
      overtimeSeconds: isComplete ? elapsedSeconds - targetSeconds : 0,
      startedAt,
      endsAt: new Date(startedAt.getTime() + targetSeconds * 1000),
      phase: getCurrentPhase(elapsedSeconds / 60),
      nextPhase: getNextPhase(elapsedSeconds / 60),
      protocolName: getProtocol(session.protocol as FastingProtocolId).name,
    };
  }, [session, now]);
}

/**
 * Dispara uma notificação do sistema quando a meta é atingida.
 *
 * Só notifica uma vez por sessão e apenas se o usuário já concedeu permissão —
 * nunca pede o acesso sozinho.
 */
export function useFastingCompletionNotice(
  session: FastingSession | null | undefined,
  timer: FastingTimer | null,
) {
  const notifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session || !timer?.isComplete) return;
    if (notifiedRef.current === session.id) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    notifiedRef.current = session.id;

    new Notification("Jejum concluído! 🎉", {
      body: `Você completou ${timer.protocolName}. Já pode abrir a janela alimentar.`,
      tag: `fasting-${session.id}`,
    });
  }, [session, timer?.isComplete, timer?.protocolName]);
}
