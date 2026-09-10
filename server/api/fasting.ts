/**
 * Rotas do jejum intermitente.
 *
 * O cronômetro é sempre derivado de `startedAt` + `targetMinutes` — o servidor
 * não guarda "tempo restante". Assim o jejum continua correndo mesmo com o app
 * fechado, e o client apenas recalcula a diferença ao abrir.
 */

import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, authed } from "../middleware/permissions";
import { startFastingSchema, endFastingSchema, type FastingSession } from "@shared/schema";
import { getProtocol, type FastingProtocolId } from "@shared/fasting";

/** Estatísticas do histórico: total, taxa de conclusão, sequência e recorde. */
function buildStats(sessions: FastingSession[]) {
  const finished = sessions.filter((s) => s.status !== "active");
  const completed = finished.filter((s) => s.status === "completed");

  const durationsMinutes = finished
    .filter((s) => s.endedAt)
    .map((s) => (new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()) / 60000);

  const longestMinutes = durationsMinutes.length > 0 ? Math.max(...durationsMinutes) : 0;
  const totalMinutes = durationsMinutes.reduce((sum, m) => sum + m, 0);

  // Sequência: jejuns concluídos consecutivos a partir do mais recente.
  // `sessions` já vem do storage em ordem decrescente de startedAt.
  let currentStreak = 0;
  for (const session of finished) {
    if (session.status !== "completed") break;
    currentStreak += 1;
  }

  return {
    totalSessions: finished.length,
    completedSessions: completed.length,
    successRate: finished.length > 0 ? completed.length / finished.length : 0,
    currentStreak,
    longestMinutes: Math.round(longestMinutes),
    totalMinutes: Math.round(totalMinutes),
    averageMinutes:
      durationsMinutes.length > 0 ? Math.round(totalMinutes / durationsMinutes.length) : 0,
  };
}

export function registerFastingRoutes(app: Express) {
  /** Jejum em andamento, ou null. */
  app.get(
    "/api/fasting/active",
    requireAuth,
    authed(async (req, res) => {
      res.json(await storage.getActiveFastingSession(req.user.id) ?? null);
    }),
  );

  /** Histórico + estatísticas agregadas. */
  app.get(
    "/api/fasting/history",
    requireAuth,
    authed(async (req, res) => {
      const limit = Math.min(Number(req.query.limit) || 60, 200);
      const sessions = await storage.getFastingSessions(req.user.id, limit);

      res.json({
        sessions: sessions.filter((s) => s.status !== "active"),
        stats: buildStats(sessions),
      });
    }),
  );

  /** Inicia um jejum. */
  app.post(
    "/api/fasting/start",
    requireAuth,
    authed(async (req, res) => {
      const parsed = startFastingSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message: "Dados do jejum inválidos",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const active = await storage.getActiveFastingSession(req.user.id);
      if (active) {
        return res.status(409).json({
          message: "Você já tem um jejum em andamento",
          session: active,
        });
      }

      const input = parsed.data;

      // Um startedAt no futuro faria o cronômetro contar ao contrário.
      if (input.startedAt && input.startedAt.getTime() > Date.now()) {
        return res.status(400).json({ message: "O início do jejum não pode ser no futuro" });
      }

      // Nos protocolos fixos a duração vem da própria definição, para o client
      // não conseguir gravar um 16:8 com duração de 3h.
      const targetMinutes =
        input.protocol === "custom"
          ? input.targetMinutes
          : getProtocol(input.protocol as FastingProtocolId).fastMinutes;

      const session = await storage.startFastingSession(req.user.id, {
        ...input,
        targetMinutes,
      });

      res.status(201).json(session);
    }),
  );

  /** Encerra o jejum ativo (concluído se bateu a meta, interrompido se não). */
  app.post(
    "/api/fasting/:id/end",
    requireAuth,
    authed(async (req, res) => {
      const parsed = endFastingSchema.safeParse(req.body ?? {});

      if (!parsed.success) {
        return res.status(400).json({ message: "Dados inválidos" });
      }

      const session = await storage.endFastingSession(
        req.params.id,
        req.user.id,
        parsed.data.notes,
      );

      if (!session) {
        return res.status(404).json({ message: "Jejum ativo não encontrado" });
      }

      res.json(session);
    }),
  );

  /** Remove um registro do histórico. */
  app.delete(
    "/api/fasting/:id",
    requireAuth,
    authed(async (req, res) => {
      const deleted = await storage.deleteFastingSession(req.params.id, req.user.id);

      if (!deleted) {
        return res.status(404).json({ message: "Jejum não encontrado" });
      }

      res.json({ success: true });
    }),
  );
}
