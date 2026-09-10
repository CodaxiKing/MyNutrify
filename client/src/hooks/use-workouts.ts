/**
 * Estado dos planos de treino e das sessões guiadas.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type {
  WorkoutPlanInput,
  WorkoutPlanWithExercises,
  WorkoutSession,
  WorkoutSessionWithLogs,
} from "@shared/schema";
import type { LibraryExercise } from "@shared/exercises-library";
import { apiFetch } from "@/lib/api-url";

export interface ExerciseQueryResult {
  items: LibraryExercise[];
  total: number;
  limit: number;
  offset: number;
}

export interface ExerciseFacets {
  bodyParts: string[];
  equipment: string[];
  targets: string[];
  total: number;
}

const PLANS_KEY = ["/api/workout-plans"] as const;
const ACTIVE_SESSION_KEY = ["/api/workout-sessions/active"] as const;
const SESSIONS_KEY = ["/api/workout-sessions"] as const;

/**
 * Busca na biblioteca de exercícios.
 *
 * A query key inclui os filtros para que cada combinação tenha o seu cache.
 */
export function useExerciseLibrary(filters: {
  search?: string;
  bodyPart?: string;
  equipment?: string;
  limit?: number;
}) {
  return useQuery<ExerciseQueryResult>({
    queryKey: ["exercise-library", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.bodyPart) params.set("bodyPart", filters.bodyPart);
      if (filters.equipment) params.set("equipment", filters.equipment);
      params.set("limit", String(filters.limit ?? 40));

      const response = await apiFetch(`/api/exercise-library?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Falha ao carregar exercícios");
      return response.json();
    },
    // O catálogo é estático; não precisa revalidar durante a sessão.
    staleTime: 60 * 60 * 1000,
  });
}

export function useExerciseFacets() {
  return useQuery<ExerciseFacets>({
    queryKey: ["/api/exercise-library/facets"],
    staleTime: 60 * 60 * 1000,
  });
}

export function useWorkoutPlans() {
  return useQuery<WorkoutPlanWithExercises[]>({ queryKey: PLANS_KEY });
}

export function useSaveWorkoutPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, plan }: { id?: string; plan: WorkoutPlanInput }) => {
      const response = await apiRequest(
        id ? "PUT" : "POST",
        id ? `/api/workout-plans/${id}` : "/api/workout-plans",
        plan,
      );
      return (await response.json()) as WorkoutPlanWithExercises;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANS_KEY });
    },
  });
}

export function useDeleteWorkoutPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/workout-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANS_KEY });
    },
  });
}

export function useActiveWorkoutSession() {
  return useQuery<WorkoutSessionWithLogs | null>({ queryKey: ACTIVE_SESSION_KEY });
}

export function useWorkoutSessions(limit = 20) {
  return useQuery<WorkoutSession[]>({
    queryKey: [...SESSIONS_KEY, limit],
    queryFn: async () => {
      const response = await apiFetch(`/api/workout-sessions?limit=${limit}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Falha ao carregar histórico");
      return response.json();
    },
  });
}

export function useStartWorkoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { planId?: string | null; planName?: string }) => {
      const response = await apiRequest("POST", "/api/workout-sessions", input);
      return (await response.json()) as WorkoutSessionWithLogs;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACTIVE_SESSION_KEY });
    },
  });
}

export interface FinishSessionInput {
  id: string;
  notes?: string | null;
  setLogs: Array<{
    /** Nulo em exercício criado pelo usuário. */
    libraryExerciseId: string | null;
    exerciseName: string;
    setNumber: number;
    reps: number;
    weight?: number | null;
    completed: boolean;
  }>;
}

export function useFinishWorkoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }: FinishSessionInput) => {
      const response = await apiRequest("POST", `/api/workout-sessions/${id}/finish`, body);
      return (await response.json()) as WorkoutSessionWithLogs;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACTIVE_SESSION_KEY });
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      // O treino conta como atividade do dia, então o resumo muda também.
      queryClient.invalidateQueries({ queryKey: ["/api/daily-summary"] });
    },
  });
}

export function useCancelWorkoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/workout-sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACTIVE_SESSION_KEY });
    },
  });
}
