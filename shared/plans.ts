/**
 * Sistema de Planos VIP do MyNutrify
 * Definições de planos, recursos e limites
 */

export type UserPlan = 'free' | 'premium' | 'vip';
export type PlanTier = UserPlan; // Alias for consistency across client/server

export interface PlanLimits {
  // AI Analysis
  aiAnalysisPerDay: number;
  aiAnalysisPerMonth: number;
  
  // Food & Nutrition
  customFoodsLimit: number;
  recipesLimit: number;
  advancedNutritionAnalysis: boolean;
  
  // Activity & GPS
  gpsTrackingUnlimited: boolean;
  advancedWorkoutPlans: boolean;
  
  // Reports & Analytics
  detailedReports: boolean;
  exportData: boolean;
  advancedCharts: boolean;
  
  // General Features
  adFree: boolean;
  prioritySupport: boolean;
  cloudBackup: boolean;
  
  // App Store Features
  offlineMode: boolean;
  multiDevice: boolean;
}

export const PLAN_FEATURES: Record<UserPlan, PlanLimits> = {
  free: {
    // AI Analysis - Limitado para users gratuitos
    aiAnalysisPerDay: 3,
    aiAnalysisPerMonth: 50,
    
    // Food & Nutrition
    customFoodsLimit: 10,
    recipesLimit: 5,
    advancedNutritionAnalysis: false,
    
    // Activity & GPS
    gpsTrackingUnlimited: false,
    advancedWorkoutPlans: false,
    
    // Reports & Analytics
    detailedReports: false,
    exportData: false,
    advancedCharts: false,
    
    // General Features
    adFree: false,
    prioritySupport: false,
    cloudBackup: false,
    
    // App Store Features
    offlineMode: false,
    multiDevice: false,
  },
  
  premium: {
    // AI Analysis - Generoso para premium
    aiAnalysisPerDay: 25,
    aiAnalysisPerMonth: 500,
    
    // Food & Nutrition
    customFoodsLimit: 100,
    recipesLimit: 50,
    advancedNutritionAnalysis: true,
    
    // Activity & GPS
    gpsTrackingUnlimited: true,
    advancedWorkoutPlans: true,
    
    // Reports & Analytics
    detailedReports: true,
    exportData: true,
    advancedCharts: true,
    
    // General Features
    adFree: true,
    prioritySupport: false,
    cloudBackup: true,
    
    // App Store Features
    offlineMode: true,
    multiDevice: true,
  },
  
  vip: {
    // AI Analysis - Ilimitado para VIP
    aiAnalysisPerDay: -1, // -1 = unlimited
    aiAnalysisPerMonth: -1,
    
    // Food & Nutrition
    customFoodsLimit: -1,
    recipesLimit: -1,
    advancedNutritionAnalysis: true,
    
    // Activity & GPS
    gpsTrackingUnlimited: true,
    advancedWorkoutPlans: true,
    
    // Reports & Analytics
    detailedReports: true,
    exportData: true,
    advancedCharts: true,
    
    // General Features
    adFree: true,
    prioritySupport: true,
    cloudBackup: true,
    
    // App Store Features
    offlineMode: true,
    multiDevice: true,
  },
};

export const PLAN_PRICES = {
  premium: {
    monthly: 9.99,
    yearly: 99.99, // 2 meses grátis
    currency: 'USD',
    stripePriceId: {
      monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
    }
  },
  vip: {
    monthly: 19.99,
    yearly: 199.99, // 2 meses grátis
    currency: 'USD',
    stripePriceId: {
      monthly: process.env.STRIPE_VIP_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_VIP_YEARLY_PRICE_ID,
    }
  }
};

export const PLAN_NAMES = {
  free: 'MyNutrify Free',
  premium: 'MyNutrify Premium',
  vip: 'MyNutrify VIP'
};

export const PLAN_DESCRIPTIONS = {
  free: 'Funcionalidades básicas para começar sua jornada fitness',
  premium: 'Recursos avançados para maximizar seus resultados',
  vip: 'Acesso completo + suporte prioritário para atletas sérios'
};

// Utility functions
export function hasFeature(userPlan: UserPlan, feature: keyof PlanLimits): boolean {
  return PLAN_FEATURES[userPlan][feature] === true;
}

export function getLimit(userPlan: UserPlan, limitType: keyof PlanLimits): number {
  const limit = PLAN_FEATURES[userPlan][limitType];
  return typeof limit === 'number' ? limit : 0;
}

export function isUnlimited(userPlan: UserPlan, limitType: keyof PlanLimits): boolean {
  const limit = PLAN_FEATURES[userPlan][limitType];
  return limit === -1;
}

export function canUseFeature(
  userPlan: UserPlan, 
  feature: keyof PlanLimits, 
  currentUsage?: number
): boolean {
  const planFeatures = PLAN_FEATURES[userPlan];
  const featureValue = planFeatures[feature];
  
  // Boolean features
  if (typeof featureValue === 'boolean') {
    return featureValue;
  }
  
  // Numeric limits
  if (typeof featureValue === 'number') {
    if (featureValue === -1) return true; // Unlimited
    if (currentUsage === undefined) return featureValue > 0;
    return currentUsage < featureValue;
  }
  
  return false;
}