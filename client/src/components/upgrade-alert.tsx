import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Zap, X } from 'lucide-react';

interface UpgradeAlertProps {
  error?: {
    error: string;
    message: string;
    limit?: number;
    used?: number;
    upgradeRequired?: boolean;
    suggestedPlans?: string[];
  };
  onClose?: () => void;
  onUpgrade?: () => void;
}

export function UpgradeAlert({ error, onClose, onUpgrade }: UpgradeAlertProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error?.upgradeRequired) {
      setIsVisible(true);
    }
  }, [error]);

  if (!isVisible || !error?.upgradeRequired) {
    return null;
  }

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleUpgrade = () => {
    onUpgrade?.();
    window.location.href = '/upgrade';
  };

  const getAlertIcon = () => {
    if (error.suggestedPlans?.includes('vip')) {
      return <Crown className="h-5 w-5 text-purple-600" />;
    }
    return <Star className="h-5 w-5 text-blue-600" />;
  };

  const getAlertColor = () => {
    if (error.suggestedPlans?.includes('vip')) {
      return 'border-purple-200 bg-purple-50 dark:bg-purple-950/20';
    }
    return 'border-blue-200 bg-blue-50 dark:bg-blue-950/20';
  };

  const getPlanBadges = () => {
    return error.suggestedPlans?.map(plan => (
      <Badge 
        key={plan}
        variant="secondary" 
        className={plan === 'vip' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}
      >
        {plan === 'premium' ? 'Premium' : 'VIP'}
      </Badge>
    ));
  };

  return (
    <Alert className={`mb-4 ${getAlertColor()}`}>
      <div className="flex items-start gap-3">
        {getAlertIcon()}
        <div className="flex-1">
          <AlertDescription className="space-y-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {error.message}
              </p>
              
              {error.limit && error.used !== undefined && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Uso atual: {error.used} de {error.limit}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Planos recomendados:
              </span>
              {getPlanBadges()}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleUpgrade}
                size="sm"
                className={error.suggestedPlans?.includes('vip') ? 
                  'bg-purple-600 hover:bg-purple-700' : 
                  'bg-blue-600 hover:bg-blue-700'
                }
              >
                <Zap className="h-4 w-4 mr-2" />
                Fazer Upgrade
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleClose}
              >
                Agora Não
              </Button>
            </div>
          </AlertDescription>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}

// Hook para gerenciar alertas de upgrade
export function useUpgradeAlert() {
  const [upgradeError, setUpgradeError] = useState<UpgradeAlertProps['error'] | null>(null);

  const handleUpgradeRequired = (error: UpgradeAlertProps['error']) => {
    if (error?.upgradeRequired) {
      setUpgradeError(error);
    }
  };

  const clearUpgradeError = () => {
    setUpgradeError(null);
  };

  return {
    upgradeError,
    handleUpgradeRequired,
    clearUpgradeError,
  };
}