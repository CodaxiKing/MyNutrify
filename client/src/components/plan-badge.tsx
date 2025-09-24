import { cn } from '@/lib/utils';
import { PlanTier } from '@shared/plans';

interface PlanBadgeProps {
  plan?: PlanTier;
  className?: string;
  onClick?: () => void;
}

export function PlanBadge({ plan: rawPlan = 'free', className, onClick }: PlanBadgeProps) {
  // Normalize plan to prevent runtime crashes from unexpected values
  const safePlan: PlanTier = (['free', 'premium', 'vip'].includes(rawPlan as any)) 
    ? rawPlan as PlanTier 
    : 'free';

  const getPlanConfig = (planType: PlanTier) => {
    switch (planType) {
      case 'free':
        return {
          text: 'Free',
          className: 'bg-gray-500 text-white',
          gradient: ''
        };
      case 'premium':
        return {
          text: 'Premium',
          className: 'bg-gradient-to-r from-pink-500 to-purple-600 text-white',
          gradient: 'from-pink-500 to-purple-600'
        };
      case 'vip':
        return {
          text: 'VIP',
          className: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
          gradient: 'from-yellow-400 to-yellow-600'
        };
    }
  };

  const config = getPlanConfig(safePlan);

  return (
    <div 
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-bold shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-105',
        config.className,
        className
      )}
      onClick={onClick}
      title={`Plano ${config.text}`}
    >
      <span>{config.text}</span>
    </div>
  );
}