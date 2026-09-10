/**
 * Middleware de autenticação e verificação de permissões VIP.
 *
 * Protege recursos premium de acordo com o plano do usuário e garante que todo
 * handler protegido receba `req.user` já resolvido a partir do banco.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { storage } from '../storage';
import { PLAN_FEATURES, canUseFeature, type UserPlan } from '@shared/plans';
import { extractBearerToken, hashToken, sessionExpiry } from '../services/auth';

// Estende o Request do Express com o usuário resolvido pelo requireAuth.
// `user` é opcional aqui porque nem toda rota passa pelo middleware — quem
// passa usa `AuthenticatedRequest` e não precisa checar null.
declare global {
  namespace Express {
    interface User {
      id: string;
      plan: UserPlan;
      weight: number | null;
      aiAnalysisUsedToday: number;
      lastAiAnalysisReset: Date;
    }

    interface Request {
      user?: User;
    }
  }
}

/**
 * Request garantidamente autenticado.
 *
 * `Express.Request['user']` é opcional no tipo base do Express, então handlers
 * que rodam depois do `requireAuth` usam este tipo para acessar `req.user` sem
 * checagem de null. Use sempre junto de `authed()` ao registrar a rota.
 */
export interface AuthenticatedRequest extends Request {
  user: Express.User;
}

/**
 * Adapta um handler que espera `AuthenticatedRequest` para a assinatura que o
 * Express aceita. Só use em rotas que passam pelo `requireAuth` antes.
 */
export function authed(
  handler: (req: AuthenticatedRequest, res: Response, next: NextFunction) => unknown,
): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(handler(req as AuthenticatedRequest, res, next)).catch(next);
  };
}

/**
 * Resolve o usuário a partir do token de sessão e o anexa em `req.user`.
 *
 * O token vem no cabeçalho `Authorization: Bearer <token>`. Responde 401 —
 * nunca 500 — quando o token falta, expirou ou não corresponde a nenhuma
 * sessão, para o client saber que precisa mandar o usuário ao login.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Faça login para continuar' });
    }

    const session = await storage.getAuthSessionByTokenHash(hashToken(token));

    if (!session) {
      return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Sessão inválida' });
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      // Limpa a sessão morta em vez de deixá-la acumulando no banco.
      await storage.deleteAuthSession(session.tokenHash);
      return res.status(401).json({ error: 'SESSION_EXPIRED', message: 'Sua sessão expirou' });
    }

    const user = await storage.getUserWithSubscription(session.userId);

    if (!user) {
      // A conta sumiu (apagada) mas a sessão sobreviveu.
      await storage.deleteAuthSession(session.tokenHash);
      return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Sessão inválida' });
    }

    // Renova a validade a cada uso: quem usa o app não é deslogado.
    void storage
      .touchAuthSession(session.id, sessionExpiry())
      .catch((error) => console.error('Falha ao renovar a sessão:', error));

    req.user = {
      id: user.id,
      plan: user.plan ?? 'free',
      weight: user.weight ?? null,
      aiAnalysisUsedToday: user.aiAnalysisUsedToday ?? 0,
      lastAiAnalysisReset: user.lastAiAnalysisReset ?? new Date(),
    };

    next();
  } catch (error) {
    console.error('Error in requireAuth:', error);
    res.status(500).json({ message: 'Erro de autenticação' });
  }
};

/**
 * Verifica se o usuário ainda tem análises de IA disponíveis hoje.
 */
export const requireAIAnalysis: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user!;

    // Zera o contador diário na virada do dia.
    const today = new Date();
    const lastReset = new Date(user.lastAiAnalysisReset);

    if (today.toDateString() !== lastReset.toDateString()) {
      await storage.resetDailyAIUsage(user.id);
      user.aiAnalysisUsedToday = 0;
      user.lastAiAnalysisReset = today;
    }

    if (!canUseFeature(user.plan, 'aiAnalysisPerDay', user.aiAnalysisUsedToday)) {
      const dailyLimit = PLAN_FEATURES[user.plan].aiAnalysisPerDay;

      return res.status(402).json({
        error: 'LIMIT_EXCEEDED',
        message: 'Limite diário de análise por IA atingido',
        limit: dailyLimit,
        used: user.aiAnalysisUsedToday,
        upgradeRequired: true,
        suggestedPlans: user.plan === 'free' ? ['premium', 'vip'] : ['vip'],
      });
    }

    next();
  } catch (error) {
    console.error('Error checking AI analysis permission:', error);
    res.status(500).json({ message: 'Erro ao verificar permissões' });
  }
};

/**
 * Fábrica de middlewares que exigem um recurso booleano do plano.
 */
function requireFeature(
  feature: keyof (typeof PLAN_FEATURES)["free"],
  error: string,
  message: string,
): RequestHandler {
  return (req, res, next) => {
    const user = req.user!;

    if (!canUseFeature(user.plan, feature)) {
      return res.status(402).json({
        error,
        message,
        upgradeRequired: true,
        suggestedPlans: ['premium', 'vip'],
      });
    }

    next();
  };
}

/** Exige plano Premium ou VIP. */
export const requirePremium: RequestHandler = (req, res, next) => {
  if (req.user!.plan === 'free') {
    return res.status(402).json({
      error: 'PREMIUM_REQUIRED',
      message: 'Este recurso requer plano Premium ou VIP',
      upgradeRequired: true,
      suggestedPlans: ['premium', 'vip'],
    });
  }
  next();
};

/** Exige plano VIP. */
export const requireVIP: RequestHandler = (req, res, next) => {
  if (req.user!.plan !== 'vip') {
    return res.status(402).json({
      error: 'VIP_REQUIRED',
      message: 'Este recurso é exclusivo para usuários VIP',
      upgradeRequired: true,
      suggestedPlans: ['vip'],
    });
  }
  next();
};

/**
 * Verifica o limite de receitas do plano.
 */
export const requireRecipeLimit: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user!;
    const userRecipes = await storage.getUserRecipes(user.id);
    const recipeCount = userRecipes.length;

    if (!canUseFeature(user.plan, 'recipesLimit', recipeCount)) {
      const limit = PLAN_FEATURES[user.plan].recipesLimit;

      return res.status(402).json({
        error: 'RECIPE_LIMIT_EXCEEDED',
        message: `Limite de receitas atingido (${limit})`,
        limit,
        used: recipeCount,
        upgradeRequired: true,
        suggestedPlans: user.plan === 'free' ? ['premium', 'vip'] : ['vip'],
      });
    }

    next();
  } catch (error) {
    console.error('Error checking recipe limit:', error);
    res.status(500).json({ message: 'Erro ao verificar limite de receitas' });
  }
};

export const requireAdvancedNutrition = requireFeature(
  'advancedNutritionAnalysis',
  'ADVANCED_NUTRITION_REQUIRED',
  'Análise nutricional avançada requer plano Premium ou VIP',
);

export const requireDetailedReports = requireFeature(
  'detailedReports',
  'DETAILED_REPORTS_REQUIRED',
  'Relatórios detalhados requerem plano Premium ou VIP',
);

export const requireDataExport = requireFeature(
  'exportData',
  'DATA_EXPORT_REQUIRED',
  'Exportação de dados requer plano Premium ou VIP',
);

export const requireAdvancedWorkouts = requireFeature(
  'advancedWorkoutPlans',
  'ADVANCED_WORKOUTS_REQUIRED',
  'Planos de treino avançados requerem plano Premium ou VIP',
);

/** Incrementa o contador diário de análises de IA. */
export async function incrementDailyAIUsage(userId: string): Promise<void> {
  await storage.incrementDailyAIUsage(userId);
}
