/** Daily totals are owned by the Android service, including while the app is closed. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { registerPlugin } from "@capacitor/core";
import { apiFetch } from "@/lib/api-url";
import { localDateKey } from "@shared/steps";
import type { DailySteps } from "@shared/schema";

export interface StepSnapshot {
  date: string;
  steps: number;
  history: { date: string; steps: number }[];
  tracking: boolean;
  vehicle: boolean;
  filterAvailable: boolean;
  updated: number;
  goal: number;
}
interface StepCounterPlugin {
  configure(input: { owner: string }): Promise<void>;
  isAvailable(): Promise<{ available: boolean; granted: boolean; notifications: boolean; enabled: boolean }>;
  requestPermission(input: { initialSteps: number }): Promise<{ granted: boolean }>;
  startTracking(input: { initialSteps: number }): Promise<{ granted: boolean }>;
  stopTracking(): Promise<void>;
  getStepCount(): Promise<StepSnapshot>;
  setGoal(input: { goal: number }): Promise<void>;
}
const StepCounter = registerPlugin<StepCounterPlugin>("StepCounter");

export function useStepDate() {
  const [date, setDate] = useState(localDateKey());
  useEffect(() => {
    const timer = window.setInterval(() => setDate(localDateKey()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return date;
}
export function useTodaySteps() {
  const today = useStepDate();
  return useQuery<DailySteps>({
    queryKey: ["/api/steps/today", today],
    queryFn: async () => {
      const response = await apiFetch(`/api/steps/today?date=${today}`);
      if (!response.ok) throw new Error("Falha ao carregar passos");
      return response.json();
    },
    staleTime: 30_000,
  });
}
export function useStepHistory(days = 7) {
  const today = useStepDate();
  return useQuery<DailySteps[]>({
    queryKey: ["/api/steps/history", days, today],
    queryFn: async () => {
      const response = await apiFetch(`/api/steps/history?days=${days}`);
      if (!response.ok) throw new Error("Falha ao carregar histórico");
      return response.json();
    },
  });
}
export function useSyncSteps() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { steps: number; date?: string; source?: "sensor" | "manual" }) => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      try {
        const response = await apiFetch("/api/steps/sync", {
          method: "POST", signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: input.date ?? localDateKey(), steps: input.steps, source: input.source ?? "sensor" }),
        });
        if (!response.ok) throw new Error("Não foi possível sincronizar os passos");
        return (await response.json()) as DailySteps;
      } finally { window.clearTimeout(timeout); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/steps/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/steps/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-summary"] });
    },
  });
}
export interface StepCounterStatus {
  available: boolean; granted: boolean; checked: boolean; notifications: boolean; enabled: boolean;
}
export function useStepSensor(initialSteps = 0, owner?: string) {
  const [status, setStatus] = useState<StepCounterStatus>({ available: false, granted: false, checked: false, notifications: false, enabled: false });
  const [snapshot, setSnapshot] = useState<StepSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [configured, setConfigured] = useState(false);
  const syncSteps = useSyncSteps();
  const syncRef = useRef(syncSteps);
  syncRef.current = syncSteps;
  const initialRef = useRef(initialSteps);
  initialRef.current = initialSteps;
  const busy = useRef(false);
  const syncBusy = useRef(false);
  const lastSync = useRef(0);
  const sent = useRef(new Map<string, number>());
  const generation = useRef(0);
  const refreshStatus = useCallback(async () => {
    try {
      const result = await StepCounter.isAvailable();
      setStatus({ ...result, checked: true });
      return result;
    } catch {
      setStatus({ available: false, granted: false, checked: true, notifications: false, enabled: false });
      return null;
    }
  }, []);
  const readAndSync = useCallback(async (force = false) => {
    if (busy.current) return;
    const currentGeneration = generation.current;
    busy.current = true;
    let next: StepSnapshot;
    try {
      next = await StepCounter.getStepCount();
      if (currentGeneration !== generation.current) return;
      setSnapshot(next);
    } catch {
      setError("Não foi possível ler o contador. Tente retomar a contagem.");
      return;
    } finally { busy.current = false; }
    const changed = next.history.filter(row => sent.current.get(row.date) !== row.steps);
    setPending(changed.length > 0);
    if (syncBusy.current) return;
    if (changed.length && (force || Date.now() - lastSync.current > 30000)) {
      syncBusy.current = true;
      try {
        lastSync.current = Date.now();
        for (const row of changed.sort((a, b) => a.date.localeCompare(b.date))) {
          if (currentGeneration !== generation.current) return;
          await syncRef.current.mutateAsync({ ...row, source: "sensor" });
          if (currentGeneration !== generation.current) return;
          sent.current.set(row.date, row.steps);
        }
        setPending(false);
        setError(null);
      } catch {
        setError("Sincronização pendente. Os passos continuam salvos no aparelho.");
      } finally { syncBusy.current = false; }
    }
  }, []);
  useEffect(() => {
    let disposed = false;
    generation.current++;
    setConfigured(false);
    setSnapshot(null);
    sent.current.clear();
    if (!owner) return;
    void (async () => {
      const available = await refreshStatus();
      if (disposed) return;
      try {
        if (available?.available) await StepCounter.configure({ owner });
        if (!disposed) { await refreshStatus(); setConfigured(true); }
      } catch { setError("Não foi possível carregar o contador desta conta."); }
    })();
    return () => { disposed = true; generation.current++; };
  }, [owner, refreshStatus]);
  useEffect(() => {
    if (!configured || !status.available || !status.granted) return;
    let disposed = false;
    const resume = async () => {
      const current = await refreshStatus();
      if (disposed) return;
      if (current?.enabled && current.granted) {
        try { await StepCounter.startTracking({ initialSteps: initialRef.current }); }
        catch { setError("Contagem interrompida. Toque em retomar para tentar novamente."); }
      }
      await readAndSync(true);
    };
    void resume();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void readAndSync(); }, 3000);
    const visible = () => { if (document.visibilityState === "visible") void resume(); };
    const online = () => { void readAndSync(true); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", online);
    return () => { disposed = true; clearInterval(timer); document.removeEventListener("visibilitychange", visible); window.removeEventListener("online", online); };
  }, [configured, status.available, status.granted, refreshStatus, readAndSync]);
  const requestPermission = useCallback(async () => {
    if (!configured) return false;
    try {
      const result = await StepCounter.requestPermission({ initialSteps: initialRef.current });
      await refreshStatus();
      if (result.granted) await readAndSync(true);
      return result.granted;
    } catch { setError("Não foi possível ativar o contador. Verifique as permissões do aplicativo."); return false; }
  }, [configured, refreshStatus, readAndSync]);
  const stopTracking = useCallback(async () => {
    try { await StepCounter.stopTracking(); await refreshStatus(); await readAndSync(true); }
    catch { setError("Não foi possível pausar o contador."); }
  }, [refreshStatus, readAndSync]);
  const setGoal = useCallback(async (goal: number) => {
    if (status.available) { await StepCounter.setGoal({ goal }); await readAndSync(); }
  }, [status.available, readAndSync]);
  return { status, snapshot, error, pending, requestPermission, stopTracking, setGoal, readAndSync, syncing: syncSteps.isPending };
}
