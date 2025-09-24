import { Crown, Star, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanTier } from '@shared/plans';

interface PremiumFeatureCardProps {
  requiredPlan: 'premium' | 'vip';
  currentPlan?: PlanTier;
  children: React.ReactNode;
  className?: string;
  onUpgradeClick?: () => void;
  feature?: string;
}

export function PremiumFeatureCard({ 
  requiredPlan, 
  currentPlan = 'free', 
  children, 
  className,
  onUpgradeClick,
  feature 
}: PremiumFeatureCardProps) {
  const hasAccess = () => {
    if (requiredPlan === 'premium') {
      return currentPlan === 'premium' || currentPlan === 'vip';
    }
    if (requiredPlan === 'vip') {
      return currentPlan === 'vip';
    }
    return false;
  };

  const getPlanConfig = () => {
    if (requiredPlan === 'premium') {
      return {
        name: 'Premium',
        icon: Star,
        gradient: 'from-pink-500 to-purple-600',
        bgGradient: 'from-pink-50 to-purple-50'
      };
    } else {
      return {
        name: 'VIP',
        icon: Crown,
        gradient: 'from-yellow-400 to-yellow-600',
        bgGradient: 'from-yellow-50 to-orange-50'
      };
    }
  };

  const config = getPlanConfig();
  const IconComponent = config.icon;

  if (hasAccess()) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn(
      'relative overflow-hidden rounded-lg border border-gray-200',
      className
    )}>
      {/* Gradient background overlay */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-10',
        `bg-gradient-to-br ${config.bgGradient}`
      )} />
      
      {/* Lock overlay */}
      <div className="relative">
        {/* Plan badge */}
        <div className="absolute top-3 right-3 z-10">
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white shadow-lg',
            `bg-gradient-to-r ${config.gradient}`
          )}>
            <IconComponent className="h-3 w-3" />
            <span>{config.name}</span>
          </div>
        </div>

        {/* Content with blur effect */}
        <div className="relative">
          <div className="filter blur-sm pointer-events-none">
            {children}
          </div>
          
          {/* Centered upgrade prompt */}
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="text-center p-6 max-w-xs">
              <div className={cn(
                'w-16 h-16 rounded-full bg-gradient-to-r flex items-center justify-center mx-auto mb-4 shadow-lg',
                `bg-gradient-to-r ${config.gradient}`
              )}>
                <Lock className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="font-bold text-gray-900 mb-2">
                Recurso {config.name}
              </h3>
              
              {feature && (
                <p className="text-sm text-gray-600 mb-4">
                  <strong>{feature}</strong> está disponível apenas no plano {config.name}
                </p>
              )}
              
              <button
                onClick={onUpgradeClick}
                className={cn(
                  'px-6 py-2 rounded-full text-white font-bold text-sm transition-all hover:shadow-lg hover:scale-105',
                  `bg-gradient-to-r ${config.gradient}`
                )}
              >
                Fazer Upgrade
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}