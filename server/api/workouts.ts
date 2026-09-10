/**
 * Rotas da biblioteca de exercícios e dos planos de treino.
 */

import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth, authed } from "../middleware/permissions";
import { workoutPlanInputSchema, finishWorkoutSessionSchema } from "@shared/schema";
import {
  queryExercises,
  getExerciseById,
  getExerciseFacets,
  estimateWorkoutCalories,
} from "../services/exercise-library";
import { recalculateDailyBurn } from "../services/daily-summary";

const exerciseQuerySchema = z.object({
  search: z.string().max(100).optional(),
  bodyPart: z.string().max(40).optional(),
  equipment: z.string().max(60).optional(),
  target: z.string().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const startSessionSchema = z.object({
  planId: z.string().uuid().nullable().optional(),
  planName: z.string().min(1).max(120).optional(),
});


/**
 * Completa o `mediaId` dos exercícios a partir da biblioteca.
 *
 * Planos salvos antes da coluna existir não têm esse dado; sem completá-lo, a
 * demonstração do movimento nunca apareceria neles. O lookup é um Map em
 * memória, então custa praticamente nada.
 */
function withMedia<T extends { exercises: Array<{ libraryExerciseId: string | null; mediaId: string | null }> }>(
  plan: T,
): T {
  return {
    ...plan,
    exercises: plan.exercises.map((exercise) => ({
      ...exercise,
      mediaId:
        exercise.mediaId ??
        (exercise.libraryExerciseId
          ? getExerciseById(exercise.libraryExerciseId)?.mediaId ?? null
          : null),
    })),
  };
}

export function registerWorkoutRoutes(app: Express) {
  // -------------------------------------------------------------------------
  // Biblioteca de exercícios (dados públicos, sem escopo de usuário)
  // -------------------------------------------------------------------------

  app.get("/api/exercise-library", (req, res) => {
    const parsed = exerciseQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Parâmetros de busca inválidos",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    res.json(queryExercises(parsed.data));
  });

  app.get("/api/exercise-library/facets", (_req, res) => {
    res.json(getExerciseFacets());
  });

  app.get("/api/exercise-library/:id", (req, res) => {
    const exercise = getExerciseById(req.params.id);

    if (!exercise) {
      return res.status(404).json({ message: "Exercício não encontrado" });
    }

    res.json(exercise);
  });

  // -------------------------------------------------------------------------
  // Planos de treino
  // -------------------------------------------------------------------------

  app.get(
    "/api/workout-plans",
    requireAuth,
    authed(async (req, res) => {
      const plans = await storage.getWorkoutPlans(req.user.id);
      res.json(plans.map(withMedia));
    }),
  );

  app.get(
    "/api/workout-plans/:id",
    requireAuth,
    authed(async (req, res) => {
      const plan = await storage.getWorkoutPlan(req.params.id, req.user.id);

      if (!plan) {
        return res.status(404).json({ message: "Treino não encontrado" });
      }

      res.json(withMedia(plan));
    }),
  );

  app.post(
    "/api/workout-plans",
    requireAuth,
    authed(async (req, res) => {
      const parsed = workoutPlanInputSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message: "Dados do treino inválidos",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      res.status(201).json(withMedia(await storage.createWorkoutPlan(req.user.id, parsed.data)));
    }),
  );

  app.put(
    "/api/workout-plans/:id",
    requireAuth,
    authed(async (req, res) => {
      const parsed = workoutPlanInputSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message: "Dados do treino inválidos",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const plan = await storage.updateWorkoutPlan(req.params.id, req.user.id, parsed.data);

      if (!plan) {
        return res.status(404).json({ message: "Treino não encontrado" });
      }

      res.json(withMedia(plan));
    }),
  );

  app.delete(
    "/api/workout-plans/:id",
    requireAuth,
    authed(async (req, res) => {
      const deleted = await storage.deleteWorkoutPlan(req.params.id, req.user.id);

      if (!deleted) {
        return res.status(404).json({ message: "Treino não encontrado" });
      }

      res.json({ success: true });
    }),
  );

  // -------------------------------------------------------------------------
  // Sessões de treino
  // -------------------------------------------------------------------------

  app.get(
    "/api/workout-sessions/active",
    requireAuth,
    authed(async (req, res) => {
      // 200 com null (em vez de 404) para o client tratar "sem treino em
      // andamento" como estado normal, não como erro.
      res.json(await storage.getActiveWorkoutSession(req.user.id) ?? null);
    }),
  );

  app.get(
    "/api/workout-sessions",
    requireAuth,
    authed(async (req, res) => {
      const limit = Math.min(Number(req.query.limit) || 30, 100);
      res.json(await storage.getWorkoutSessions(req.user.id, limit));
    }),
  );

  app.post(
    "/api/workout-sessions",
    requireAuth,
    authed(async (req, res) => {
      const parsed = startSessionSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ message: "Dados inválidos" });
      }

      // Um treino em andamento por vez — devolve o existente em vez de criar
      // uma sessão órfã que ficaria aberta para sempre.
      const active = await storage.getActiveWorkoutSession(req.user.id);
      if (active) {
        return res.status(200).json(active);
      }

      const { planId, planName } = parsed.data;
      let resolvedName = planName;

      if (planId) {
        const plan = await storage.getWorkoutPlan(planId, req.user.id);
        if (!plan) {
          return res.status(404).json({ message: "Treino não encontrado" });
        }
        resolvedName = plan.name;
      }

      if (!resolvedName) {
        return res.status(400).json({ message: "Informe um plano ou um nome para o treino" });
      }

      const session = await storage.startWorkoutSession(req.user.id, planId ?? null, resolvedName);
      res.status(201).json({ ...session, setLogs: [] });
    }),
  );

  app.post(
    "/api/workout-sessions/:id/finish",
    requireAuth,
    authed(async (req, res) => {
      const parsed = finishWorkoutSessionSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message: "Dados da sessão inválidos",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const active = await storage.getActiveWorkoutSession(req.user.id);
      if (!active || active.id !== req.params.id) {
        return res.status(404).json({ message: "Sessão de treino não encontrada" });
      }

      // Calorias a partir das regiões efetivamente trabalhadas.
      // Exercícios criados pelo usuário não estão na biblioteca; o MET desses
      // sai do padrão de musculação dentro de estimateWorkoutCalories.
      const bodyParts = parsed.data.setLogs
        .map((log) =>
          log.libraryExerciseId
            ? getExerciseById(log.libraryExerciseId)?.bodyPart
            : undefined,
        )
        .filter((part): part is NonNullable<typeof part> => part !== undefined);

      const durationSeconds = Math.max(
        0,
        Math.round((Date.now() - new Date(active.startedAt).getTime()) / 1000),
      );

      const caloriesBurned = estimateWorkoutCalories(
        bodyParts,
        durationSeconds,
        req.user.weight ?? 70,
      );

      const session = await storage.finishWorkoutSession(req.params.id, req.user.id, {
        setLogs: parsed.data.setLogs.map((log) => ({
          libraryExerciseId: log.libraryExerciseId ?? null,
          exerciseName: log.exerciseName,
          setNumber: log.setNumber,
          reps: log.reps,
          weight: log.weight ?? null,
          completed: log.completed,
        })),
        caloriesBurned,
        notes: parsed.data.notes,
      });

      if (!session) {
        return res.status(404).json({ message: "Sessão de treino não encontrada" });
      }

      // O treino também é uma atividade do dia: registrá-lo aqui faz as
      // calorias entrarem no resumo diário pelo mesmo caminho das demais
      // atividades, sem uma segunda contabilidade paralela.
      if (caloriesBurned > 0) {
        await storage.createActivityEntry({
          userId: req.user.id,
          exerciseId: null,
          customExerciseName: active.planName,
          duration: Math.max(1, Math.round(durationSeconds / 60)),
          intensity: "moderate",
          caloriesBurned,
          date: new Date(),
          notes: "Registrado automaticamente ao finalizar o treino",
        });

        await recalculateDailyBurn(req.user.id);
      }

      res.json(session);
    }),
  );

  app.delete(
    "/api/workout-sessions/:id",
    requireAuth,
    authed(async (req, res) => {
      const cancelled = await storage.cancelWorkoutSession(req.params.id, req.user.id);

      if (!cancelled) {
        return res.status(404).json({ message: "Sessão de treino não encontrada" });
      }

      res.json({ success: true });
    }),
  );
}
