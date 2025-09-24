/**
 * Middleware de verificação de permissões VIP
 * Protege recursos premium baseado no plano do usuário
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { PLAN_FEATURES, canUseFeature, UserPlan } from '@shared/plans';

// Extend Request to include user with plan
declare global {
  namespace Express {
    interface User {
      id: string;
      plan: UserPlan;
      aiAnalysisUsedToday: number;
      lastAiAnalysisReset: Date;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: Express.User;
}

/**
 * Middleware básico para verificar se usuário está autenticado
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Para demonstração, usar user-1 mas carregar dados reais do DB
    const userId = 'user-1';
    
    let user = await storage.getUserWithSubscription(userId);
    
    if (!user) {
      // Criar usuário se não existir (para demonstração)
      await storage.createUser({
        id: userId,
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@mynutrify.app',
        age: 30,
        weight: 70,
        height: 170,
        activityLevel: 'MODERATELY_ACTIVE',
        fitnessGoal: 'MAINTAIN_WEIGHT',
        gender: 'male'
      });
      
      user = await storage.getUserWithSubscription(userId);
    }
    
    if (!user) {
      return res.status(500).json({ message: 'Erro ao carregar usuário' });
    }
    
    // Carregar dados reais do usuário
    (req as AuthenticatedRequest).user = {
      id: user.id,
      plan: user.plan || 'free',
      aiAnalysisUsedToday: user.aiAnalysisUsedToday || 0,
      lastAiAnalysisReset: user.lastAiAnalysisReset || new Date()
    };
    
    next();
  } catch (error) {
    console.error('Error in requireAuth:', error);
    res.status(500).json({ message: 'Erro de autenticação' });
  }
}

/**
 * Middleware para verificar se usuário pode usar análise AI
 */
export async function requireAIAnalysis(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    
    // Reset daily counter se necessário
    const today = new Date();
    const lastReset = new Date(user.lastAiAnalysisReset);
    
    if (today.toDateString() !== lastReset.toDateString()) {
      // Reset daily usage
      await storage.resetDailyAIUsage(user.id);
      user.aiAnalysisUsedToday = 0;
      user.lastAiAnalysisReset = today;
    }
    
    // Verificar limite
    if (!canUseFeature(user.plan, 'aiAnalysisPerDay', user.aiAnalysisUsedToday)) {
      const dailyLimit = PLAN_FEATURES[user.plan].aiAnalysisPerDay;
      
      return res.status(402).json({
        error: 'LIMIT_EXCEEDED',
        message: 'Limite diário de análise AI atingido',
        limit: dailyLimit,
        used: user.aiAnalysisUsedToday,
        upgradeRequired: true,
        suggestedPlans: user.plan === 'free' ? ['premium', 'vip'] : ['vip']
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking AI analysis permission:', error);
    res.status(500).json({ message: 'Erro ao verificar permissões' });
  }
}

/**
 * Middleware para recursos premium
 */
export function requirePremium(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = req.user;
  
  if (user.plan === 'free') {
    return res.status(402).json({
      error: 'PREMIUM_REQUIRED',
      message: 'Este recurso requer plano Premium ou VIP',
      upgradeRequired: true,
      suggestedPlans: ['premium', 'vip']
    });
  }
  
  next();
}

/**
 * Middleware para recursos VIP
 */
export function requireVIP(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = req.user;
  
  if (user.plan !== 'vip') {
    return res.status(402).json({
      error: 'VIP_REQUIRED',
      message: 'Este recurso é exclusivo para usuários VIP',
      upgradeRequired: true,
      suggestedPlans: ['vip']
    });
  }
  
  next();
}

/**
 * Middleware para verificar limite de receitas
 */
export async function requireRecipeLimit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
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
        suggestedPlans: user.plan === 'free' ? ['premium', 'vip'] : ['vip']
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking recipe limit:', error);
    res.status(500).json({ message: 'Erro ao verificar limite de receitas' });
  }
}

/**
 * Middleware para recursos avançados de nutrição
 */
export function requireAdvancedNutrition(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = req.user;
  
  if (!canUseFeature(user.plan, 'advancedNutritionAnalysis')) {
    return res.status(402).json({
      error: 'ADVANCED_NUTRITION_REQUIRED',
      message: 'Análise nutricional avançada requer plano Premium ou VIP',
      upgradeRequired: true,
      suggestedPlans: ['premium', 'vip']
    });
  }
  
  next();
}

/**
 * Middleware para relatórios detalhados
 */
export function requireDetailedReports(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = req.user;
  
  if (!canUseFeature(user.plan, 'detailedReports')) {
    return res.status(402).json({
      error: 'DETAILED_REPORTS_REQUIRED',
      message: 'Relatórios detalhados requerem plano Premium ou VIP',
      upgradeRequired: true,
      suggestedPlans: ['premium', 'vip']
    });
  }
  
  next();
}

/**
 * Middleware para exportação de dados
 */
export function requireDataExport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = req.user;
  
  if (!canUseFeature(user.plan, 'exportData')) {
    return res.status(402).json({
      error: 'DATA_EXPORT_REQUIRED',
      message: 'Exportação de dados requer plano Premium ou VIP',
      upgradeRequired: true,
      suggestedPlans: ['premium', 'vip']
    });
  }
  
  next();
}

/**
 * Função helper para incrementar uso de AI
 */
export async function incrementDailyAIUsage(userId: string): Promise<void> {
  await storage.incrementDailyAIUsage(userId);
}