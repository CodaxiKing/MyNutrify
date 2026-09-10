/**
 * Rotas do contador de passos.
 *
 * O total do dia vem do client (o sensor do Android conta desde o boot, então
 * quem sabe transformar isso em "passos de hoje" é o app). Distância e
 * calorias são recalculadas aqui a partir do perfil, para que o número gravado
 * não dependa de um client desatualizado.
 */

import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, authed } from "../middleware/permissions";
import { syncStepsSchema } from "@shared/schema";
import { stepsToCalories, stepsToMeters, localDateKey } from "@shared/steps";
import { recalculateDailyBurn } from "../services/daily-summary";

export function registerStepRoutes(app: Express) {
  /** Passos de hoje. */
  app.get(
    "/api/steps/today",
    requireAuth,
    authed(async (req, res) => {
      // A data vem do client porque o fuso do servidor pode ser outro.
      const date = typeof req.query.date === "string" ? req.query.date : localDateKey();

      const record = await storage.getDailySteps(req.user.id, date);

      res.json(
        record ?? {
          date,
          steps: 0,
          distanceMeters: 0,
          caloriesBurned: 0,
          source: "sensor",
        },
      );
    }),
  );

  /** Histórico dos últimos dias. */
  app.get(
    "/api/steps/history",
    requireAuth,
    authed(async (req, res) => {
      const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
      res.json(await storage.getRecentDailySteps(req.user.id, days));
    }),
  );

  /** Grava o total do dia. */
  app.post(
    "/api/steps/sync",
    requireAuth,
    authed(async (req, res) => {
      const parsed = syncStepsSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { date, steps, source } = parsed.data;
      const user = await storage.getUser(req.user.id);

      const distanceMeters = stepsToMeters(steps, user?.height, user?.gender);
      const caloriesBurned = stepsToCalories(
        steps,
        user?.weight,
        user?.height,
        user?.gender,
      );

      const record = await storage.upsertDailySteps({
        userId: req.user.id,
        date,
        steps,
        distanceMeters,
        caloriesBurned,
        source,
      });

      // Os passos entram no gasto calórico do painel.
      await recalculateDailyBurn(req.user.id, new Date(`${date}T12:00:00`));

      res.json(record);
    }),
  );
}
